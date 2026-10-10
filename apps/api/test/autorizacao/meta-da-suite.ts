import ts from 'typescript';
import { ETAPAS_EM_ORDEM } from './catalogo-do-doc-3-secao-11.js';
import type { CasoDoDoc3, EtapaDoBackend } from './catalogo-do-doc-3-secao-11.js';

export type SituacaoDoTeste = 'ativo' | 'todo' | 'inativo';

export interface TesteExtraido {
  readonly arquivo: string;
  readonly titulos: readonly string[];
  readonly situacao: SituacaoDoTeste;
}

interface ContextoDeAncestrais {
  readonly titulos: readonly string[];
  readonly inativo: boolean;
}

interface ChamadaDeRegistro {
  readonly base: string;
  readonly modificadores: readonly string[];
}

const FUNCOES_DE_REGISTRO: ReadonlySet<string> = new Set(['it', 'test', 'describe', 'suite']);
const AGRUPADORES: ReadonlySet<string> = new Set(['describe', 'suite']);
const MODIFICADORES_QUE_DESLIGAM: ReadonlySet<string> = new Set(['skip', 'skipIf', 'runIf']);
const OPCOES_QUE_DESLIGAM: ReadonlySet<string> = new Set(['skip', 'todo']);

function desembrulhar(expressao: ts.Expression, modificadores: readonly string[]): ChamadaDeRegistro | undefined {
  if (ts.isIdentifier(expressao)) return { base: expressao.text, modificadores };
  if (ts.isPropertyAccessExpression(expressao)) {
    return desembrulhar(expressao.expression, [...modificadores, expressao.name.text]);
  }
  if (ts.isCallExpression(expressao)) return desembrulhar(expressao.expression, modificadores);
  return undefined;
}

function chamadaDeRegistro(chamada: ts.CallExpression): ChamadaDeRegistro | undefined {
  const registro = desembrulhar(chamada.expression, []);
  return registro !== undefined && FUNCOES_DE_REGISTRO.has(registro.base) ? registro : undefined;
}

function textoLiteral(no: ts.Node | undefined): string | undefined {
  if (no !== undefined && (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no))) return no.text;
  return undefined;
}

function opcaoDesliga(no: ts.Node): boolean {
  if (!ts.isObjectLiteralExpression(no)) return false;
  return no.properties.some(
    (propriedade) =>
      ts.isPropertyAssignment(propriedade) &&
      OPCOES_QUE_DESLIGAM.has(propriedade.name.getText()) &&
      propriedade.initializer.kind !== ts.SyntaxKind.FalseKeyword,
  );
}

function funcaoDoCorpo(argumentos: readonly ts.Expression[]): ts.FunctionLikeDeclaration | undefined {
  return argumentos.find((argumento): argumento is ts.ArrowFunction | ts.FunctionExpression => ts.isArrowFunction(argumento) || ts.isFunctionExpression(argumento));
}

function situacaoDe(registro: ChamadaDeRegistro, chamada: ts.CallExpression, ancestrais: ContextoDeAncestrais): SituacaoDoTeste {
  if (ancestrais.inativo) return 'inativo';
  if (registro.modificadores.some((modificador) => MODIFICADORES_QUE_DESLIGAM.has(modificador))) return 'inativo';
  if (chamada.arguments.some(opcaoDesliga)) return 'inativo';
  if (registro.modificadores.includes('todo') || funcaoDoCorpo(chamada.arguments) === undefined) return 'todo';
  return 'ativo';
}

function visitar(no: ts.Node, ancestrais: ContextoDeAncestrais, arquivo: string, acumulado: TesteExtraido[]): void {
  if (!ts.isCallExpression(no)) {
    ts.forEachChild(no, (filho) => visitar(filho, ancestrais, arquivo, acumulado));
    return;
  }
  const registro = chamadaDeRegistro(no);
  if (registro === undefined) {
    ts.forEachChild(no, (filho) => visitar(filho, ancestrais, arquivo, acumulado));
    return;
  }
  const titulo = textoLiteral(no.arguments[0]);
  const titulos = titulo === undefined ? ancestrais.titulos : [...ancestrais.titulos, titulo];
  const situacao = situacaoDe(registro, no, ancestrais);
  if (!AGRUPADORES.has(registro.base)) {
    acumulado.push({ arquivo, titulos, situacao });
    return;
  }
  const corpo = funcaoDoCorpo(no.arguments);
  if (corpo?.body === undefined) return;
  visitar(corpo.body, { titulos, inativo: situacao !== 'ativo' }, arquivo, acumulado);
}

export function extrairTestes(arquivo: string, conteudo: string): readonly TesteExtraido[] {
  const origem = ts.createSourceFile(arquivo, conteudo, ts.ScriptTarget.Latest, true);
  const acumulado: TesteExtraido[] = [];
  visitar(origem, { titulos: [], inativo: false }, arquivo, acumulado);
  return acumulado;
}

export function contemIdComLimites(titulo: string, id: string): boolean {
  const idEscapado = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${idEscapado}(?![A-Za-z0-9])`).test(titulo);
}

function mencionaId(teste: TesteExtraido, id: string): boolean {
  return teste.titulos.some((titulo) => contemIdComLimites(titulo, id));
}

function idsDeTituloDo(caso: CasoDoDoc3): readonly string[] {
  return caso.idsDeTitulo ?? [caso.id];
}

function temTesteAtivo(testes: readonly TesteExtraido[], id: string): boolean {
  return testes.some((teste) => teste.situacao === 'ativo' && mencionaId(teste, id));
}

function indiceDaEtapa(etapa: EtapaDoBackend): number {
  return ETAPAS_EM_ORDEM.indexOf(etapa);
}

function exigidoAte(caso: CasoDoDoc3, etapaAtual: EtapaDoBackend): boolean {
  return indiceDaEtapa(caso.etapa) <= indiceDaEtapa(etapaAtual);
}

export function casosSemTeste(
  catalogo: readonly CasoDoDoc3[],
  etapaAtual: EtapaDoBackend,
  testes: readonly TesteExtraido[],
): readonly string[] {
  return catalogo
    .filter((caso) => exigidoAte(caso, etapaAtual))
    .filter((caso) => !idsDeTituloDo(caso).every((id) => temTesteAtivo(testes, id)))
    .map((caso) => caso.id);
}

function temTodoRotulado(testes: readonly TesteExtraido[], marca: string, rotulo: string): boolean {
  return testes.some(
    (teste) =>
      teste.situacao === 'todo' &&
      mencionaId(teste, marca) &&
      teste.titulos.some((titulo) => titulo.includes(rotulo)),
  );
}

export function casosBloqueadosSemTodo(
  catalogo: readonly CasoDoDoc3[],
  etapaAtual: EtapaDoBackend,
  testes: readonly TesteExtraido[],
): readonly string[] {
  return catalogo
    .filter((caso) => !exigidoAte(caso, etapaAtual))
    .filter((caso) => !temTodoRotulado(testes, caso.id, `bloqueada até a ${caso.etapa}`))
    .map((caso) => caso.id);
}

export interface ProblemaDeLacuna {
  readonly marca: string;
  readonly problema: 'sem-todo-visivel' | 'ja-tem-teste-ativo';
}

export function lacunasComProblema(
  catalogo: readonly CasoDoDoc3[],
  testes: readonly TesteExtraido[],
): readonly ProblemaDeLacuna[] {
  return catalogo
    .flatMap((caso) => caso.lacunasDeclaradas ?? [])
    .flatMap<ProblemaDeLacuna>((lacuna) => {
      if (temTesteAtivo(testes, lacuna.marca)) return [{ marca: lacuna.marca, problema: 'ja-tem-teste-ativo' }];
      if (!temTodoRotulado(testes, lacuna.marca, `lacuna da ${lacuna.etapa}`)) return [{ marca: lacuna.marca, problema: 'sem-todo-visivel' }];
      return [];
    });
}

export function lacunasSemCoberturaNoAceite(
  catalogo: readonly CasoDoDoc3[],
  marcasCobertasNoAceite: readonly string[],
  testesDoAceite: readonly TesteExtraido[],
): readonly string[] {
  return catalogo
    .flatMap((caso) => caso.lacunasDeclaradas ?? [])
    .map(({ marca }) => marca)
    .filter((marca) => marcasCobertasNoAceite.includes(marca))
    .filter((marca) => !temTesteAtivo(testesDoAceite, marca));
}

export interface ConfiguracaoDoVitest {
  readonly nome: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

function textosDoArray(no: ts.Expression): readonly string[] {
  if (!ts.isArrayLiteralExpression(no)) return [];
  return no.elements.flatMap((elemento) => {
    const texto = textoLiteral(elemento);
    return texto === undefined ? [] : [texto];
  });
}

function propriedadesDoObjeto(no: ts.Node, nome: string): readonly ts.PropertyAssignment[] {
  const encontradas: ts.PropertyAssignment[] = [];
  const percorrer = (atual: ts.Node): void => {
    if (ts.isPropertyAssignment(atual) && atual.name.getText() === nome) encontradas.push(atual);
    ts.forEachChild(atual, percorrer);
  };
  percorrer(no);
  return encontradas;
}

function listaDoBlocoTest(bloco: ts.PropertyAssignment | undefined, nome: string): readonly string[] {
  if (bloco === undefined || !ts.isObjectLiteralExpression(bloco.initializer)) return [];
  const lista = bloco.initializer.properties.find(
    (propriedade): propriedade is ts.PropertyAssignment => ts.isPropertyAssignment(propriedade) && propriedade.name.getText() === nome,
  );
  return lista === undefined ? [] : textosDoArray(lista.initializer);
}

export function lerConfiguracaoDoVitest(nome: string, conteudo: string): ConfiguracaoDoVitest {
  const origem = ts.createSourceFile(nome, conteudo, ts.ScriptTarget.Latest, true);
  const [bloco] = propriedadesDoObjeto(origem, 'test');
  return { nome, include: listaDoBlocoTest(bloco, 'include'), exclude: listaDoBlocoTest(bloco, 'exclude') };
}

export function globParaRegex(glob: string): RegExp {
  const corpo = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '@@DIRETORIOS@@')
    .replace(/\*/g, '[^/]*')
    .replace(/@@DIRETORIOS@@/g, '(?:.*/)?');
  return new RegExp(`^${corpo}$`);
}

export function configuracaoExecuta(configuracao: ConfiguracaoDoVitest, caminhoRelativo: string): boolean {
  const casa = (globs: readonly string[]): boolean => globs.some((glob) => globParaRegex(glob).test(caminhoRelativo));
  return casa(configuracao.include) && !casa(configuracao.exclude);
}

export function configsExecutadosPeloCi(
  workflow: string,
  filtro: string,
  scripts: Readonly<Record<string, string>>,
): readonly string[] {
  const alvo = new RegExp(`pnpm --filter ${filtro.replace(/[.*+?^${}()|[\]\\/@]/g, '\\$&')} (\\S+)`, 'g');
  return [...workflow.matchAll(alvo)].flatMap(([, script]) => {
    const comando = scripts[script!];
    if (comando === undefined || !comando.startsWith('vitest')) return [];
    return [/--config (\S+)/.exec(comando)?.[1] ?? 'vitest.config.ts'];
  });
}
