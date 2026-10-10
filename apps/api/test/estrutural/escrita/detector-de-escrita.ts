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

export type CategoriaDeAchado = 'escrita' | 'set-config' | 'rota-fora-do-nest';

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
const PACOTES_HTTP = /\/node_modules\/(@nestjs\/(common|core|platform-express)|@types\/express[^/]*|express|fastify)\//;

const VERBOS_HTTP: ReadonlySet<string> = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);
const RECIPIENTES_DE_VERBO: ReadonlySet<string> = new Set([
  'HttpServer',
  'AbstractHttpAdapter',
  'ExpressAdapter',
  'FastifyAdapter',
  'Application',
  'Router',
  'IRouter',
  'Express',
  'FastifyInstance',
]);
const RECIPIENTES_DE_USE: ReadonlySet<string> = new Set([
  ...RECIPIENTES_DE_VERBO,
  'INestApplication',
  'NestExpressApplication',
]);

const VERBOS_DE_ESCRITA_SQL = /^(insert|update|delete|merge|truncate|create|alter|drop|grant|revoke|copy|call|do|reindex|vacuum|comment)$/;
const VERBOS_DE_CONTROLE_SQL = /^(savepoint|release|rollback|commit|begin|start|end|abort)$/;
const VERBOS_DE_LEITURA_SQL = /^(select|values|table|explain|show)$/;
const DML_DENTRO_DE_WITH = /\b(insert|update|delete|merge)\b/i;
const CHAMADA_DE_SET_CONFIG = /\bset_config\b/i;
const PROFUNDIDADE_MAXIMA_DE_CONSTANTE = 8;

type CategoriaDeSql = 'leitura' | 'fragmento' | 'escrita' | 'controle' | 'set' | 'set-config';

function semComentarios(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

function categoriaDoSql(texto: string, ehInstrucao: boolean): CategoriaDeSql {
  const limpo = semComentarios(texto);
  if (CHAMADA_DE_SET_CONFIG.test(limpo)) return 'set-config';
  if (!ehInstrucao) return 'fragmento';
  const verbo = /^\s*(\w+)/.exec(limpo)?.[1]?.toLowerCase() ?? '';
  if (verbo === 'set') return 'set';
  if (VERBOS_DE_ESCRITA_SQL.test(verbo)) return 'escrita';
  if (verbo === 'with') return DML_DENTRO_DE_WITH.test(limpo) ? 'escrita' : 'leitura';
  if (VERBOS_DE_CONTROLE_SQL.test(verbo)) return 'controle';
  if (VERBOS_DE_LEITURA_SQL.test(verbo)) return 'leitura';
  return 'fragmento';
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
  return modelo.head.text + modelo.templateSpans.map((trecho) => `?${trecho.literal.text}`).join('');
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
    this.avaliarSql(chamada, nomeDoCallee.text, texto, ehExecutarSqlDoOrm);
  }

  private sqlDeTemplateMarcado(marcado: ts.TaggedTemplateExpression): void {
    if (!ts.isIdentifier(marcado.tag)) return;
    const simbolo = simboloResolvido(this.checker, marcado.tag);
    const ehSqlDoKysely = simbolo !== undefined && simbolo.getName() === 'sql' && declaradoEm(simbolo, PACOTE_KYSELY);
    if (!ehSqlDoKysely) return;
    this.avaliarSql(marcado, 'sql', textoDoTemplateMarcado(marcado.template), true);
  }

  private avaliarSql(no: ts.Node, origem: string, texto: string | undefined, ehInstrucao: boolean): void {
    const zona = zonaDoArquivo(this.relativo);
    if (zona === 'fora') return;
    if (texto === undefined) {
      if (EXCECOES_DE_SQL_INDETERMINADO[this.relativo] === undefined) this.violar(no, 'sql-indeterminado', origem);
      return;
    }
    const categoria = categoriaDoSql(texto, ehInstrucao);
    if (categoria === 'escrita') this.achar('escrita', `sql:${origem}`);
    const mexeNaSessao = categoria === 'set' || categoria === 'set-config';
    if (mexeNaSessao) this.achar('set-config', categoria);
    if (mexeNaSessao && !this.podeAjustarASessao()) {
      this.violar(no, 'set-config-restrito', categoria);
      return;
    }
    const ehLeitura = categoria === 'leitura' || categoria === 'fragmento';
    if (zona === 'leitura' && !ehLeitura) this.violar(no, 'leitura-fora-da-allowlist', `sql:${categoria}`);
  }

  private podeAjustarASessao(): boolean {
    return this.relativo.startsWith(PASTA_DO_BANCO) || ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO.includes(this.relativo);
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
    const excecoes = EXCECOES_DE_ROTA_FORA_DO_NEST[this.relativo] ?? [];
    if (!excecoes.includes(nome.text)) this.violar(chamada, 'rota-fora-do-nest', nome.text);
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
