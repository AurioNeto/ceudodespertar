import ts from 'typescript';
import { linhaDe, percorrer } from '../escrita/motor-de-programa.js';
import type { ProgramaAnalisavel } from '../escrita/motor-de-programa.js';

export type FormaDaOcorrencia = 'comparacao' | 'case' | 'colecao';

export interface Ocorrencia {
  readonly arquivo: string;
  readonly linha: number;
  readonly forma: FormaDaOcorrencia;
}

export interface PoliticaDeNomeDeGrupo {
  readonly proibidos: ReadonlySet<string>;
  readonly ehExcluido: (caminhoRelativo: string) => boolean;
}

export interface RelatorioDeNomeDeGrupo {
  readonly ocorrencias: readonly Ocorrencia[];
  readonly arquivosVarridos: readonly string[];
}

const OPERADORES_DE_IGUALDADE: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

const METODOS_DE_PERTENCIMENTO: ReadonlySet<string> = new Set(['includes', 'indexOf', 'has', 'some']);

function semParenteses(no: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(no) ? semParenteses(no.expression) : no;
}

function textoLiteral(no: ts.Expression): string | undefined {
  const interno = semParenteses(no);
  if (ts.isStringLiteral(interno) || ts.isNoSubstitutionTemplateLiteral(interno)) {
    return interno.text;
  }
  return undefined;
}

function ehLiteralProibido(no: ts.Expression, proibidos: ReadonlySet<string>): boolean {
  const texto = textoLiteral(no);
  return texto !== undefined && proibidos.has(texto);
}

function constituentesSemNulos(tipo: ts.Type): readonly ts.Type[] {
  const constituentes = tipo.isUnion() ? tipo.types : [tipo];
  return constituentes.filter((parte) => (parte.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) === 0);
}

function ehTipoDeGrupo(tipo: ts.Type, proibidos: ReadonlySet<string>): boolean {
  const constituentes = constituentesSemNulos(tipo);
  return (
    constituentes.length > 0 &&
    constituentes.every((parte) => parte.isStringLiteral() && proibidos.has(parte.value))
  );
}

function operandoTemTipoDeGrupo(checker: ts.TypeChecker, no: ts.Expression, proibidos: ReadonlySet<string>): boolean {
  return ehTipoDeGrupo(checker.getTypeAtLocation(no), proibidos);
}

function semEnvoltorios(no: ts.Expression): ts.Expression {
  const interno = semParenteses(no);
  if (ts.isAsExpression(interno) || ts.isSatisfiesExpression(interno) || ts.isNonNullExpression(interno)) {
    return semEnvoltorios(interno.expression);
  }
  return interno;
}

function ehNulo(no: ts.Expression): boolean {
  const interno = semParenteses(no);
  return interno.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(interno) && interno.text === 'undefined');
}

function elementoChaveDe(elemento: ts.Expression): ts.Expression {
  const interno = semEnvoltorios(elemento);
  return ts.isArrayLiteralExpression(interno) && interno.elements.length > 0 ? interno.elements[0]! : interno;
}

function literalDeColecaoComGrupo(no: ts.Expression, proibidos: ReadonlySet<string>): boolean {
  const interno = semEnvoltorios(no);
  if (ts.isArrayLiteralExpression(interno)) {
    return interno.elements.some((elemento) => ehLiteralProibido(elementoChaveDe(elemento), proibidos));
  }
  if (!ts.isNewExpression(interno) || !ts.isIdentifier(interno.expression)) return false;
  if (!['Set', 'Map'].includes(interno.expression.text)) return false;
  const primeiro = interno.arguments?.[0];
  return primeiro !== undefined && literalDeColecaoComGrupo(primeiro, proibidos);
}

function inicializadorConstDe(checker: ts.TypeChecker, no: ts.Expression): ts.Expression | undefined {
  const interno = semEnvoltorios(no);
  if (!ts.isIdentifier(interno)) return undefined;
  const simbolo = checker.getSymbolAtLocation(interno);
  const original = simbolo !== undefined && (simbolo.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(simbolo) : simbolo;
  const declaracao = original?.valueDeclaration;
  const ehConst =
    declaracao !== undefined &&
    ts.isVariableDeclaration(declaracao) &&
    (ts.getCombinedNodeFlags(declaracao) & ts.NodeFlags.Const) !== 0;
  return ehConst ? declaracao.initializer : undefined;
}

function colecaoDeGrupo(checker: ts.TypeChecker, colecao: ts.Expression, proibidos: ReadonlySet<string>): boolean {
  if (literalDeColecaoComGrupo(colecao, proibidos)) return true;
  const inicializador = inicializadorConstDe(checker, colecao);
  if (inicializador !== undefined && literalDeColecaoComGrupo(inicializador, proibidos)) return true;
  const tipo = checker.getTypeAtLocation(colecao);
  const referencia = tipo as ts.TypeReference;
  if (referencia.target === undefined) return false;
  return checker.getTypeArguments(referencia).some((argumento) => ehTipoDeGrupo(argumento, proibidos));
}

function comparacaoComGrupo(
  checker: ts.TypeChecker,
  no: ts.BinaryExpression,
  proibidos: ReadonlySet<string>,
): boolean {
  if (ehNulo(no.left) || ehNulo(no.right)) return false;
  return [no.left, no.right].some(
    (operando) => ehLiteralProibido(operando, proibidos) || operandoTemTipoDeGrupo(checker, operando, proibidos),
  );
}

function casoComGrupo(checker: ts.TypeChecker, no: ts.CaseClause, proibidos: ReadonlySet<string>): boolean {
  const alvo = (no.parent.parent as ts.SwitchStatement).expression;
  return (
    ehLiteralProibido(no.expression, proibidos) ||
    operandoTemTipoDeGrupo(checker, no.expression, proibidos) ||
    operandoTemTipoDeGrupo(checker, alvo, proibidos)
  );
}

function pertencimentoComGrupo(checker: ts.TypeChecker, no: ts.CallExpression, proibidos: ReadonlySet<string>): boolean {
  if (!ts.isPropertyAccessExpression(no.expression)) return false;
  if (!METODOS_DE_PERTENCIMENTO.has(no.expression.name.text)) return false;
  const argumentoLiteralDeGrupo = no.arguments.some((argumento) => ehLiteralProibido(argumento, proibidos));
  return argumentoLiteralDeGrupo || colecaoDeGrupo(checker, no.expression.expression, proibidos);
}

function formaDe(
  checker: ts.TypeChecker,
  no: ts.Node,
  proibidos: ReadonlySet<string>,
): FormaDaOcorrencia | undefined {
  if (ts.isBinaryExpression(no) && OPERADORES_DE_IGUALDADE.has(no.operatorToken.kind)) {
    return comparacaoComGrupo(checker, no, proibidos) ? 'comparacao' : undefined;
  }
  if (ts.isCaseClause(no)) return casoComGrupo(checker, no, proibidos) ? 'case' : undefined;
  if (ts.isCallExpression(no)) return pertencimentoComGrupo(checker, no, proibidos) ? 'colecao' : undefined;
  return undefined;
}

export function detectarNomeDeGrupo(
  programa: ProgramaAnalisavel,
  raiz: string,
  politica: PoliticaDeNomeDeGrupo,
): RelatorioDeNomeDeGrupo {
  const prefixo = `${raiz}/`;
  const varridos = programa.arquivos.filter(
    (arquivo) => arquivo.fileName.startsWith(prefixo) && !politica.ehExcluido(arquivo.fileName.slice(prefixo.length)),
  );
  const ocorrencias = varridos.flatMap((arquivo) => {
    const achadas: Ocorrencia[] = [];
    percorrer(arquivo, (no) => {
      const forma = formaDe(programa.checker, no, politica.proibidos);
      if (forma !== undefined) {
        achadas.push({ arquivo: arquivo.fileName.slice(prefixo.length), linha: linhaDe(arquivo, no), forma });
      }
    });
    return achadas;
  });
  return { ocorrencias, arquivosVarridos: varridos.map((arquivo) => arquivo.fileName.slice(prefixo.length)) };
}
