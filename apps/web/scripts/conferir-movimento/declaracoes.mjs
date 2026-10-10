import { createHash } from 'node:crypto';
import ts from 'typescript';

const EXTENSAO_DE_CODIGO = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const EXTENSAO_DE_ARQUIVO_DE_TESTE = /\.test\.[jt]sx?$|(?:^|\/)apoioDeTeste\.[jt]sx?$|\/testes\//;
const NOME_DO_BARREL = /(?:^|\/)index\.ts$/;
const CHAMADAS_DE_TESTE = new Set(['describe', 'it', 'test']);
const FUNCOES_DE_MODULO_DO_VITEST = new Set(['mock', 'doMock', 'importActual', 'importMock']);
const SUBSTITUTO_DO_ESPECIFICADOR = "'<modulo>'";
const SUBSTITUTO_DO_NOME = '<nome>';
const NOME_DA_EXPORTACAO_PADRAO = 'default';
const SEPARADOR_DE_STATEMENTS = '\n\n';
const TAMANHO_DO_HASH = 16;
const LARGURA_DO_NOME_ANONIMO = 60;

export const ehCodigo = (caminho) => EXTENSAO_DE_CODIGO.test(caminho);

export const ehArquivoDeTeste = (caminho) => EXTENSAO_DE_ARQUIVO_DE_TESTE.test(caminho);

const lerArquivo = (caminho, conteudo) =>
  ts.createSourceFile(caminho, conteudo, ts.ScriptTarget.Latest, true);

const ehImportDeModulo = (statement) =>
  ts.isImportDeclaration(statement) ||
  (ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference));

const ehReexportDeModulo = (statement) =>
  ts.isExportDeclaration(statement) && statement.moduleSpecifier !== undefined;

const ehLinhaDeImport = (statement) => ehImportDeModulo(statement) || ehReexportDeModulo(statement);

const resumir = (texto) =>
  createHash('sha256').update(texto).digest('hex').slice(0, TAMANHO_DO_HASH);

const primeiraLinha = (texto) => texto.split('\n', 1)[0].slice(0, LARGURA_DO_NOME_ANONIMO);

function especificadorDoNo(no) {
  if (ts.isImportTypeNode(no) && ts.isLiteralTypeNode(no.argument)) {
    return ts.isStringLiteralLike(no.argument.literal) ? no.argument.literal : undefined;
  }

  if (!ts.isCallExpression(no)) {
    return undefined;
  }

  const [primeiroArgumento] = no.arguments;
  const ehImportDinamico = no.expression.kind === ts.SyntaxKind.ImportKeyword;
  const ehFuncaoDeModuloDoVitest =
    ts.isPropertyAccessExpression(no.expression) &&
    ts.isIdentifier(no.expression.expression) &&
    no.expression.expression.text === 'vi' &&
    FUNCOES_DE_MODULO_DO_VITEST.has(no.expression.name.text);

  return (ehImportDinamico || ehFuncaoDeModuloDoVitest) &&
    primeiroArgumento !== undefined &&
    ts.isStringLiteralLike(primeiroArgumento)
    ? primeiroArgumento
    : undefined;
}

const mascaraDe = (arquivo, no, substituto) => ({
  inicio: no.getStart(arquivo),
  fim: no.end,
  substituto,
});

function mascarasDeEspecificadores(arquivo) {
  const mascaras = [];
  const visitar = (no) => {
    const especificador = especificadorDoNo(no);

    if (especificador) {
      mascaras.push(mascaraDe(arquivo, especificador, SUBSTITUTO_DO_ESPECIFICADOR));
    }

    ts.forEachChild(no, visitar);
  };

  visitar(arquivo);

  return mascaras;
}

function aplicarMascaras(texto, inicio, fim, mascaras) {
  const dentroDoTrecho = mascaras
    .filter((mascara) => mascara.inicio >= inicio && mascara.fim <= fim)
    .toSorted((a, b) => a.inicio - b.inicio);
  let resultado = '';
  let cursor = inicio;

  for (const mascara of dentroDoTrecho) {
    resultado += texto.slice(cursor, mascara.inicio) + mascara.substituto;
    cursor = mascara.fim;
  }

  return resultado + texto.slice(cursor, fim);
}

function raizDaChamada(expressao) {
  return ts.isPropertyAccessExpression(expressao) ||
    ts.isElementAccessExpression(expressao) ||
    ts.isCallExpression(expressao)
    ? raizDaChamada(expressao.expression)
    : expressao;
}

function nomeDaChamadaDeTeste(arquivo, statement) {
  if (!ts.isExpressionStatement(statement) || !ts.isCallExpression(statement.expression)) {
    return undefined;
  }

  const raiz = raizDaChamada(statement.expression.expression);

  if (!ts.isIdentifier(raiz) || !CHAMADAS_DE_TESTE.has(raiz.text)) {
    return undefined;
  }

  const [titulo] = statement.expression.arguments;
  const textoDoTitulo =
    titulo && ts.isStringLiteralLike(titulo) ? titulo.text : (titulo?.getText(arquivo) ?? '');

  return `${raiz.text}(${JSON.stringify(textoDoTitulo)})`;
}

function nomeDeDeclaracaoNomeada(statement) {
  const declaracoesDeVariavel = ts.isVariableStatement(statement)
    ? statement.declarationList.declarations
    : undefined;

  if (declaracoesDeVariavel) {
    return declaracoesDeVariavel.length === 1 ? declaracoesDeVariavel[0].name : undefined;
  }

  const ehNomeada =
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement);

  return ehNomeada ? statement.name : undefined;
}

function nomesDeVariaveis(arquivo, statement) {
  return statement.declarationList.declarations
    .map((declaracao) => declaracao.name.getText(arquivo))
    .join(', ');
}

function identificar(arquivo, statement) {
  const nomeDoTeste = nomeDaChamadaDeTeste(arquivo, statement);

  if (nomeDoTeste) {
    return { nome: nomeDoTeste, chamadaDeTeste: true };
  }

  const noDoNome = nomeDeDeclaracaoNomeada(statement);

  if (noDoNome) {
    return { nome: noDoNome.getText(arquivo), noDoNome, chamadaDeTeste: false };
  }

  if (ts.isVariableStatement(statement)) {
    return { nome: nomesDeVariaveis(arquivo, statement), chamadaDeTeste: false };
  }

  const ehExportacaoPadraoSemNome =
    ts.isExportAssignment(statement) ||
    ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && !statement.name);

  return {
    nome: ehExportacaoPadraoSemNome ? NOME_DA_EXPORTACAO_PADRAO : undefined,
    chamadaDeTeste: false,
  };
}

function corpoDaDeclaracao(arquivo, statement, noDoNome, mascarasDoArquivo) {
  const exportacao = statement.modifiers?.find(
    (modificador) => modificador.kind === ts.SyntaxKind.ExportKeyword,
  );
  const mascaras = [
    ...mascarasDoArquivo,
    ...(exportacao ? [mascaraDe(arquivo, exportacao, '')] : []),
    ...(noDoNome ? [mascaraDe(arquivo, noDoNome, SUBSTITUTO_DO_NOME)] : []),
  ];

  return aplicarMascaras(arquivo.text, statement.getStart(arquivo), statement.end, mascaras).trim();
}

function criarDeclaracao(arquivo, statement, mascaras) {
  const { nome, noDoNome, chamadaDeTeste } = identificar(arquivo, statement);
  const corpo = corpoDaDeclaracao(arquivo, statement, noDoNome, mascaras);

  return {
    arquivo: arquivo.fileName,
    emTeste: ehArquivoDeTeste(arquivo.fileName),
    nome: nome ?? primeiraLinha(corpo),
    hash: resumir(corpo),
    chamadaDeTeste,
  };
}

const statementsDeDeclaracao = (arquivo) =>
  arquivo.statements.filter(
    (statement) => !ehLinhaDeImport(statement) && !ts.isEmptyStatement(statement),
  );

export function declaracoesDe(caminho, conteudo) {
  const arquivo = lerArquivo(caminho, conteudo);
  const mascaras = mascarasDeEspecificadores(arquivo);

  return statementsDeDeclaracao(arquivo).map((statement) =>
    criarDeclaracao(arquivo, statement, mascaras),
  );
}

export function conteudoComparavel(caminho, conteudo) {
  if (!ehCodigo(caminho)) {
    return conteudo.toString('latin1');
  }

  const arquivo = lerArquivo(caminho, conteudo.toString('utf8'));
  const mascaras = mascarasDeEspecificadores(arquivo);
  const textosDosStatements = arquivo.statements
    .filter((statement) => !ehLinhaDeImport(statement))
    .map((statement) =>
      aplicarMascaras(arquivo.text, statement.pos, statement.end, mascaras).trim(),
    );
  const fimDoArquivo = arquivo.text.slice(arquivo.endOfFileToken.pos).trim();

  return [...textosDosStatements, fimDoArquivo].join(SEPARADOR_DE_STATEMENTS);
}

export function ehBarrel(caminho, conteudo) {
  if (!NOME_DO_BARREL.test(caminho)) {
    return false;
  }

  const { statements } = lerArquivo(caminho, conteudo.toString('utf8'));

  return statements.length > 0 && statements.every(ehReexportDeModulo);
}
