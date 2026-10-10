import { relative } from 'node:path';
import ts from 'typescript';
import {
  declaradoEm,
  estaEmPosicaoDeTipo,
  linhaDe,
  nomeDoRecipiente,
  percorrer,
  simboloResolvido,
} from './motor-de-programa.js';
import type { ProgramaAnalisavel } from './motor-de-programa.js';
import {
  ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO,
  ARQUIVOS_QUE_ENCERRAM_TRANSACAO_EM_SQL_CRU,
  EXCECOES_DE_ROTA_FORA_DO_NEST,
  EXCECOES_DE_SQL_INDETERMINADO,
  MEMBROS_DE_ESCRITA,
  MEMBROS_DE_LEITURA,
  MEMBROS_SO_DO_BANCO,
  PASTA_DO_BANCO,
  zonaDoArquivo,
} from './politica-da-api.js';

export type RegraViolada =
  | 'fora-da-persistencia'
  | 'leitura-fora-da-allowlist'
  | 'so-no-banco'
  | 'set-config-restrito'
  | 'sql-indeterminado'
  | 'rota-fora-do-nest';

export interface Violacao {
  readonly arquivo: string;
  readonly linha: number;
  readonly regra: RegraViolada;
  readonly simbolo: string;
}

export type CategoriaDeAchado = 'escrita' | 'set-config' | 'transacao-em-sql' | 'rota-fora-do-nest';

export interface Achado {
  readonly arquivo: string;
  readonly categoria: CategoriaDeAchado;
  readonly simbolo: string;
}

export interface Relatorio {
  readonly violacoes: readonly Violacao[];
  readonly achados: readonly Achado[];
}

const PACOTES_DE_DADOS = /\/node_modules\/(kysely|@mikro-orm\/[^/]+)\//;
const PACOTE_KYSELY = /\/node_modules\/kysely\//;
const PACOTE_MIKRO_ORM = /\/node_modules\/@mikro-orm\/[^/]+\//;
const PACOTES_HTTP = /\/node_modules\/@nestjs\/(common|core)\//;

const VERBOS_HTTP: ReadonlySet<string> = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);
const RECIPIENTES_DE_VERBO: ReadonlySet<string> = new Set(['HttpServer', 'AbstractHttpAdapter']);
const RECIPIENTES_DE_USE: ReadonlySet<string> = new Set([
  ...RECIPIENTES_DE_VERBO,
  'INestApplication',
  'NestExpressApplication',
]);

const VERBOS_DE_ESCRITA_SQL = /^(insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|copy|call|do|reindex|vacuum|comment)$/;
const VERBOS_DE_PONTO_DE_SALVAMENTO_SQL = /^(savepoint|release)$/;
const VERBOS_DE_TRANSACAO_SQL = /^(commit|begin|start|end|abort|prepare)$/;
const ROLLBACK_PARA_PONTO_DE_SALVAMENTO = /^\s*rollback(\s+(work|transaction))?\s+to\b/i;
const VERBOS_DE_LEITURA_SQL = /^(select|values|table|explain|show)$/;
const DML_DENTRO_DE_WITH = /\b(insert|update|delete|merge)\b/i;
const VERBOS_DE_SESSAO_SQL = /^(set|reset)$/;
const MEMBROS_QUE_EXECUTAM_SQL: ReadonlySet<string> = new Set(['execute', 'executeTakeFirst', 'executeTakeFirstOrThrow']);
const MEMBROS_QUE_EXPOEM_O_SERVIDOR: ReadonlySet<string> = new Set(['getInstance', 'getHttpServer']);
const CHAMADA_DE_SET_CONFIG = /\bset_config\b/i;
const PROFUNDIDADE_MAXIMA_DE_CONSTANTE = 8;
const MARCA_DE_INTERPOLACAO = '?';

type CategoriaDeSql = 'leitura' | 'fragmento' | 'escrita' | 'controle' | 'transacao' | 'set' | 'set-config';

function semComentarios(sql: string): string {
  let limpo = '';
  let aspas: string | undefined;
  let indice = 0;
  while (indice < sql.length) {
    const caractere = sql.charAt(indice);
    const doisCaracteres = sql.slice(indice, indice + 2);
    if (aspas === undefined && doisCaracteres === '--') {
      const fimDaLinha = sql.indexOf('\n', indice);
      indice = fimDaLinha === -1 ? sql.length : fimDaLinha;
      limpo += ' ';
      continue;
    }
    if (aspas === undefined && doisCaracteres === '/*') {
      const fimDoBloco = sql.indexOf('*/', indice + 2);
      indice = fimDoBloco === -1 ? sql.length : fimDoBloco + 2;
      limpo += ' ';
      continue;
    }
    if (caractere === "'" || caractere === '"') aspas = aspas === caractere ? undefined : (aspas ?? caractere);
    limpo += caractere;
    indice += 1;
  }
  return limpo;
}

const GRAVIDADE_DA_CATEGORIA: readonly CategoriaDeSql[] = [
  'fragmento',
  'leitura',
  'controle',
  'transacao',
  'escrita',
  'set',
  'set-config',
];

function instrucoesDe(sql: string): readonly string[] {
  const instrucoes: string[] = [];
  let atual = '';
  let aspas: string | undefined;
  for (const caractere of sql) {
    if (aspas === undefined && caractere === ';') {
      instrucoes.push(atual);
      atual = '';
      continue;
    }
    if (caractere === "'" || caractere === '"') aspas = aspas === caractere ? undefined : (aspas ?? caractere);
    atual += caractere;
  }
  instrucoes.push(atual);
  return instrucoes;
}

function categoriaDaInstrucao(instrucao: string): CategoriaDeSql {
  const verbo = /^\s*(\w+)/.exec(instrucao)?.[1]?.toLowerCase() ?? '';
  if (VERBOS_DE_SESSAO_SQL.test(verbo)) return 'set';
  if (VERBOS_DE_ESCRITA_SQL.test(verbo)) return 'escrita';
  if (verbo === 'with') return DML_DENTRO_DE_WITH.test(instrucao) ? 'escrita' : 'leitura';
  if (VERBOS_DE_PONTO_DE_SALVAMENTO_SQL.test(verbo)) return 'controle';
  if (verbo === 'rollback') return ROLLBACK_PARA_PONTO_DE_SALVAMENTO.test(instrucao) ? 'controle' : 'transacao';
  if (VERBOS_DE_TRANSACAO_SQL.test(verbo)) return 'transacao';
  if (VERBOS_DE_LEITURA_SQL.test(verbo)) return 'leitura';
  return 'fragmento';
}

function ehSelectPuro(instrucao: string): boolean {
  const verbo = /^\s*(\w+)/.exec(instrucao)?.[1]?.toLowerCase() ?? '';
  if (verbo === 'with') return !DML_DENTRO_DE_WITH.test(instrucao);
  return verbo === 'select';
}

function instrucoesPreenchidas(texto: string): readonly string[] {
  return instrucoesDe(semComentarios(texto)).filter((instrucao) => instrucao.trim() !== '');
}

function categoriasDoSql(texto: string): readonly CategoriaDeSql[] {
  const limpo = semComentarios(texto);
  const chamaSetConfig: readonly CategoriaDeSql[] = CHAMADA_DE_SET_CONFIG.test(limpo) ? ['set-config'] : [];
  return [...instrucoesDe(limpo).map(categoriaDaInstrucao), ...chamaSetConfig];
}

function maisGrave(categorias: readonly CategoriaDeSql[]): CategoriaDeSql {
  return categorias.reduce((pior, categoria) =>
    GRAVIDADE_DA_CATEGORIA.indexOf(categoria) > GRAVIDADE_DA_CATEGORIA.indexOf(pior) ? categoria : pior,
  );
}

function textoLiteral(checker: ts.TypeChecker, expressao: ts.Expression, profundidade = 0): string | undefined {
  if (profundidade > PROFUNDIDADE_MAXIMA_DE_CONSTANTE) return undefined;
  if (
    ts.isStringLiteral(expressao) ||
    ts.isNoSubstitutionTemplateLiteral(expressao) ||
    ts.isNumericLiteral(expressao)
  ) {
    return expressao.text;
  }
  if (
    ts.isParenthesizedExpression(expressao) ||
    ts.isAsExpression(expressao) ||
    ts.isSatisfiesExpression(expressao) ||
    ts.isNonNullExpression(expressao)
  ) {
    return textoLiteral(checker, expressao.expression, profundidade + 1);
  }
  if (ts.isBinaryExpression(expressao) && expressao.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const esquerda = textoLiteral(checker, expressao.left, profundidade + 1);
    const direita = textoLiteral(checker, expressao.right, profundidade + 1);
    return esquerda === undefined || direita === undefined ? undefined : esquerda + direita;
  }
  if (ts.isTemplateExpression(expressao)) {
    let texto = expressao.head.text;
    for (const trecho of expressao.templateSpans) {
      const valor = textoLiteral(checker, trecho.expression, profundidade + 1);
      if (valor === undefined) return undefined;
      texto += valor + trecho.literal.text;
    }
    return texto;
  }
  if (ts.isIdentifier(expressao)) return textoDeConstante(checker, expressao, profundidade);
  const tipo = checker.getTypeAtLocation(expressao);
  return tipo.isStringLiteral() ? tipo.value : undefined;
}

function textoDeConstante(checker: ts.TypeChecker, identificador: ts.Identifier, profundidade: number): string | undefined {
  const declaracao = simboloResolvido(checker, identificador)?.valueDeclaration;
  const ehConstanteComValor =
    declaracao !== undefined &&
    ts.isVariableDeclaration(declaracao) &&
    declaracao.initializer !== undefined &&
    (ts.getCombinedNodeFlags(declaracao) & ts.NodeFlags.Const) !== 0;
  return ehConstanteComValor ? textoLiteral(checker, declaracao.initializer, profundidade + 1) : undefined;
}

function textoDoTemplateMarcado(modelo: ts.TemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(modelo)) return modelo.text;
  return modelo.head.text + modelo.templateSpans.map((trecho) => `${MARCA_DE_INTERPOLACAO}${trecho.literal.text}`).join('');
}

function semParenteses(no: ts.Node): ts.Node {
  let atual = no;
  while (ts.isParenthesizedExpression(atual.parent)) atual = atual.parent;
  return atual;
}

function ehExecucaoDireta(no: ts.Node): boolean {
  const alvo = semParenteses(no);
  const pai = alvo.parent;
  if (ts.isPropertyAccessExpression(pai) && pai.expression === alvo) {
    const chamada = pai.parent;
    return ts.isCallExpression(chamada) && chamada.expression === pai && MEMBROS_QUE_EXECUTAM_SQL.has(pai.name.text);
  }
  return false;
}

function algumaInstrucaoComecaComInterpolacao(modelo: ts.TemplateLiteral): boolean {
  if (!ts.isTemplateExpression(modelo)) return false;
  return instrucoesDe(semComentarios(textoDoTemplateMarcado(modelo))).some((instrucao) =>
    instrucao.trimStart().startsWith(MARCA_DE_INTERPOLACAO),
  );
}

function ehCaminhoDeRota(checker: ts.TypeChecker, argumento: ts.Expression | undefined): boolean {
  if (argumento === undefined) return false;
  const tipo = checker.getTypeAtLocation(argumento);
  const ehTexto = (tipo.flags & ts.TypeFlags.StringLike) !== 0;
  const ehListaOuRegExp = checker.isArrayType(tipo) || tipo.getSymbol()?.getName() === 'RegExp';
  return ehTexto || ehListaOuRegExp;
}

function nomeDoMembro(chamada: ts.CallExpression): ts.Identifier | undefined {
  const alvo = chamada.expression;
  if (ts.isPropertyAccessExpression(alvo) && ts.isIdentifier(alvo.name)) return alvo.name;
  return ts.isIdentifier(alvo) ? alvo : undefined;
}

function simboloDoUso(checker: ts.TypeChecker, identificador: ts.Identifier): ts.Symbol | undefined {
  const pai = identificador.parent;
  const ehNomeAbreviadoDeDesestruturacao =
    ts.isBindingElement(pai) &&
    pai.name === identificador &&
    pai.propertyName === undefined &&
    ts.isObjectBindingPattern(pai.parent);
  if (ehNomeAbreviadoDeDesestruturacao) {
    return checker.getTypeAtLocation(pai.parent).getProperty(identificador.text);
  }
  return simboloResolvido(checker, identificador);
}

function ehEsquerdaDeMembroDeDados(checker: ts.TypeChecker, identificador: ts.Identifier): boolean {
  const pai = identificador.parent;
  if (!ts.isPropertyAccessExpression(pai) || pai.expression !== identificador) return false;
  const membro = checker.getSymbolAtLocation(pai.name);
  return membro !== undefined && declaradoEm(membro, PACOTES_DE_DADOS);
}

function ehAnyAplicadoATipoDeDados(checker: ts.TypeChecker, no: ts.Node): boolean {
  if (!ts.isAsExpression(no) && !ts.isTypeAssertionExpression(no)) return false;
  if (no.type.kind !== ts.SyntaxKind.AnyKeyword) return false;
  const tipo = checker.getTypeAtLocation(no.expression);
  const simbolo = tipo.aliasSymbol ?? tipo.getSymbol();
  return simbolo !== undefined && declaradoEm(simbolo, PACOTES_DE_DADOS);
}

class Coletor {
  readonly violacoes: Violacao[] = [];
  readonly achados: Achado[] = [];

  constructor(
    private readonly checker: ts.TypeChecker,
    private readonly arquivoDoPrograma: ts.SourceFile,
    private readonly relativo: string,
  ) {}

  private violar(no: ts.Node, regra: RegraViolada, simbolo: string): void {
    this.violacoes.push({ arquivo: this.relativo, linha: linhaDe(this.arquivoDoPrograma, no), regra, simbolo });
  }

  private achar(categoria: CategoriaDeAchado, simbolo: string): void {
    this.achados.push({ arquivo: this.relativo, categoria, simbolo });
  }

  analisar(): void {
    percorrer(this.arquivoDoPrograma, (no) => {
      if (ts.isIdentifier(no)) this.usoDeIdentificador(no);
      if (ts.isIdentifier(no) && MEMBROS_QUE_EXPOEM_O_SERVIDOR.has(no.text)) this.acessoAoServidor(no);
      if (ts.isElementAccessExpression(no)) this.usoPorIndice(no);
      if (ts.isCallExpression(no)) {
        this.sqlDeChamada(no);
        this.rotaForaDoNest(no);
      }
      if (ts.isTaggedTemplateExpression(no)) this.sqlDeTemplateMarcado(no);
      if (zonaDoArquivo(this.relativo) === 'fora' && ehAnyAplicadoATipoDeDados(this.checker, no)) {
        this.violar(no, 'fora-da-persistencia', 'as any');
      }
    });
  }

  private usoDeIdentificador(identificador: ts.Identifier): void {
    if (estaEmPosicaoDeTipo(identificador)) return;
    const simbolo = simboloDoUso(this.checker, identificador);
    const ehValorDeDados =
      simbolo !== undefined &&
      (simbolo.flags & ts.SymbolFlags.Value) !== 0 &&
      declaradoEm(simbolo, PACOTES_DE_DADOS);
    if (!ehValorDeDados || ehEsquerdaDeMembroDeDados(this.checker, identificador)) return;
    this.usoDeDados(identificador, simbolo.getName());
  }

  private usoPorIndice(acesso: ts.ElementAccessExpression): void {
    const argumento = acesso.argumentExpression;
    if (!ts.isStringLiteralLike(argumento)) return;
    const simbolo = this.checker.getTypeAtLocation(acesso.expression).getProperty(argumento.text);
    const ehDeDados = simbolo !== undefined && declaradoEm(simbolo, PACOTES_DE_DADOS);
    if (ehDeDados) this.usoDeDados(acesso, argumento.text);
  }

  private usoDeDados(no: ts.Node, nome: string): void {
    const zona = zonaDoArquivo(this.relativo);
    if (zona === 'fora') {
      this.violar(no, 'fora-da-persistencia', nome);
      return;
    }
    const ehNoBanco = this.relativo.startsWith(PASTA_DO_BANCO);
    if (MEMBROS_SO_DO_BANCO.has(nome) && !ehNoBanco) this.violar(no, 'so-no-banco', nome);
    if (MEMBROS_DE_ESCRITA.has(nome)) this.achar('escrita', nome);
    const foraDaAllowlist = !MEMBROS_DE_LEITURA.has(nome) && !MEMBROS_SO_DO_BANCO.has(nome);
    if (zona === 'leitura' && foraDaAllowlist) {
      this.violar(no, 'leitura-fora-da-allowlist', nome);
    }
  }

  private sqlDeChamada(chamada: ts.CallExpression): void {
    const nomeDoCallee = nomeDoMembro(chamada);
    const primeiro = chamada.arguments[0];
    if (nomeDoCallee === undefined || primeiro === undefined) return;
    const simbolo = simboloResolvido(this.checker, nomeDoCallee);
    if (simbolo === undefined) return;
    const ehExecutarSqlDoOrm = nomeDoCallee.text === 'execute' && declaradoEm(simbolo, PACOTE_MIKRO_ORM);
    const ehSqlCru = nomeDoCallee.text === 'raw' && declaradoEm(simbolo, PACOTES_DE_DADOS);
    if (!ehExecutarSqlDoOrm && !ehSqlCru) return;
    const texto = textoLiteral(this.checker, primeiro);
    const executado = () => ehExecutarSqlDoOrm || this.ehExecutado(chamada);
    this.avaliarSql(chamada, nomeDoCallee.text, texto, executado);
  }

  private sqlDeTemplateMarcado(marcado: ts.TaggedTemplateExpression): void {
    if (!ts.isIdentifier(marcado.tag)) return;
    const simbolo = simboloResolvido(this.checker, marcado.tag);
    const ehSqlDoKysely = simbolo !== undefined && simbolo.getName() === 'sql' && declaradoEm(simbolo, PACOTE_KYSELY);
    if (!ehSqlDoKysely) return;
    const indeterminado = algumaInstrucaoComecaComInterpolacao(marcado.template) && this.ehExecutado(marcado);
    const texto = indeterminado ? undefined : textoDoTemplateMarcado(marcado.template);
    this.avaliarSql(marcado, 'sql', texto, () => this.ehExecutado(marcado));
  }

  private avaliarSql(no: ts.Node, origem: string, texto: string | undefined, executado: () => boolean): void {
    const zona = zonaDoArquivo(this.relativo);
    if (zona === 'fora') return;
    if (texto === undefined) {
      if (!Object.hasOwn(EXCECOES_DE_SQL_INDETERMINADO, this.relativo)) this.violar(no, 'sql-indeterminado', origem);
      return;
    }
    const categorias = categoriasDoSql(texto);
    const categoria = maisGrave(categorias);
    if (categorias.includes('escrita')) this.achar('escrita', `sql:${origem}`);
    if (categorias.includes('transacao')) this.achar('transacao-em-sql', 'transacao');
    if (categorias.includes('transacao') && zona !== 'leitura' && !this.podeControlarTransacaoEmSqlCru()) {
      this.violar(no, 'so-no-banco', 'sql:transacao');
    }
    const mexeNaSessao = categoria === 'set' || categoria === 'set-config';
    if (mexeNaSessao) this.achar('set-config', categoria);
    if (mexeNaSessao && !this.podeAjustarASessao()) {
      this.violar(no, 'set-config-restrito', categoria);
      return;
    }
    const ehLeitura = categoria === 'leitura' || categoria === 'fragmento';
    if (zona === 'leitura' && !ehLeitura) {
      this.violar(no, 'leitura-fora-da-allowlist', `sql:${categoria}`);
      return;
    }
    const foraDaAllowlistDeSelect = !instrucoesPreenchidas(texto).every(ehSelectPuro);
    if (zona === 'leitura' && foraDaAllowlistDeSelect && executado()) {
      this.violar(no, 'leitura-fora-da-allowlist', 'sql:fora-da-allowlist');
    }
  }

  private ehExecutado(no: ts.Node): boolean {
    if (ehExecucaoDireta(no)) return true;
    const alvo = semParenteses(no);
    const declaracao = alvo.parent;
    if (!ts.isVariableDeclaration(declaracao) || declaracao.initializer !== alvo || !ts.isIdentifier(declaracao.name)) {
      return false;
    }
    const simbolo = this.checker.getSymbolAtLocation(declaracao.name);
    let executado = false;
    percorrer(this.arquivoDoPrograma, (candidato) => {
      const ehUso = ts.isIdentifier(candidato) && this.checker.getSymbolAtLocation(candidato) === simbolo;
      if (ehUso && ehExecucaoDireta(candidato)) executado = true;
    });
    return executado;
  }

  private podeControlarTransacaoEmSqlCru(): boolean {
    return (
      this.relativo.startsWith(PASTA_DO_BANCO) || Object.hasOwn(ARQUIVOS_QUE_ENCERRAM_TRANSACAO_EM_SQL_CRU, this.relativo)
    );
  }

  private podeAjustarASessao(): boolean {
    return this.relativo.startsWith(PASTA_DO_BANCO) || Object.hasOwn(ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO, this.relativo);
  }

  private rotaForaDoNest(chamada: ts.CallExpression): void {
    const nome = nomeDoMembro(chamada);
    if (nome === undefined || nome === chamada.expression) return;
    const ehUse = nome.text === 'use';
    if (!ehUse && !VERBOS_HTTP.has(nome.text)) return;
    const simbolo = this.checker.getSymbolAtLocation(nome);
    const recipiente = simbolo === undefined ? undefined : nomeDoRecipiente(simbolo);
    const recipientes = ehUse ? RECIPIENTES_DE_USE : RECIPIENTES_DE_VERBO;
    const ehDoServidorHttp =
      simbolo !== undefined &&
      declaradoEm(simbolo, PACOTES_HTTP) &&
      recipiente !== undefined &&
      recipientes.has(recipiente);
    if (!ehDoServidorHttp) return;
    if (!ehUse && !ehCaminhoDeRota(this.checker, chamada.arguments[0])) return;
    this.achar('rota-fora-do-nest', nome.text);
    const excecoes: Readonly<Record<string, string>> = Object.hasOwn(EXCECOES_DE_ROTA_FORA_DO_NEST, this.relativo)
      ? EXCECOES_DE_ROTA_FORA_DO_NEST[this.relativo as keyof typeof EXCECOES_DE_ROTA_FORA_DO_NEST]
      : {};
    const comCaminho = ehCaminhoDeRota(this.checker, chamada.arguments[0]);
    if (!Object.hasOwn(excecoes, nome.text) || comCaminho) this.violar(chamada, 'rota-fora-do-nest', nome.text);
  }

  private acessoAoServidor(identificador: ts.Identifier): void {
    const simbolo = simboloDoUso(this.checker, identificador);
    if (simbolo === undefined || !declaradoEm(simbolo, PACOTES_HTTP)) return;
    this.achar('rota-fora-do-nest', identificador.text);
    this.violar(identificador, 'rota-fora-do-nest', identificador.text);
  }
}

export function detectarEscrita(programa: ProgramaAnalisavel, raizDeSrc: string): Relatorio {
  const violacoes: Violacao[] = [];
  const achados: Achado[] = [];
  for (const arquivo of programa.arquivos) {
    const relativo = relative(raizDeSrc, arquivo.fileName).split('\\').join('/');
    const coletor = new Coletor(programa.checker, arquivo, relativo);
    coletor.analisar();
    violacoes.push(...coletor.violacoes);
    achados.push(...coletor.achados);
  }
  return { violacoes, achados };
}
