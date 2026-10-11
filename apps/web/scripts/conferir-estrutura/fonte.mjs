import ts from 'typescript';

export const lerFonte = (arvore, caminho) =>
  ts.createSourceFile(caminho, arvore.ler(caminho), ts.ScriptTarget.Latest, true);

export function desembrulhar(expressao) {
  const embrulhada =
    ts.isAsExpression(expressao) ||
    ts.isSatisfiesExpression(expressao) ||
    ts.isParenthesizedExpression(expressao);

  return embrulhada ? desembrulhar(expressao.expression) : expressao;
}

export function nomeDaPropriedade(propriedade) {
  const { name } = propriedade;
  const temNomeLiteral =
    name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name));

  return temNomeLiteral ? name.text : undefined;
}

export function valorDaPropriedade(objeto, nome) {
  const propriedade = objeto.properties.find(
    (candidata) => ts.isPropertyAssignment(candidata) && nomeDaPropriedade(candidata) === nome,
  );

  return propriedade && desembrulhar(propriedade.initializer);
}

export const textoLiteral = (expressao) =>
  expressao !== undefined && ts.isStringLiteralLike(expressao) ? expressao.text : undefined;

const declaracoesDeTopo = (fonte) =>
  fonte.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations);

export function objetoDaConstante(fonte, nome) {
  const declaracao = declaracoesDeTopo(fonte).find(
    (candidata) => ts.isIdentifier(candidata.name) && candidata.name.text === nome,
  );
  const objeto = declaracao?.initializer && desembrulhar(declaracao.initializer);

  if (!objeto || !ts.isObjectLiteralExpression(objeto)) {
    throw new Error(`${fonte.fileName}: não achei o objeto literal ${nome}`);
  }

  const semNome = objeto.properties.filter((propriedade) => nomeDaPropriedade(propriedade) === undefined);

  if (semNome.length > 0) {
    throw new Error(`${fonte.fileName}: ${nome} tem ${semNome.length} propriedades sem nome literal`);
  }

  return objeto;
}

function nomesImportados(declaracao) {
  const { importClause } = declaracao;
  const nomeadas = importClause?.namedBindings;
  const elementos = nomeadas && ts.isNamedImports(nomeadas) ? nomeadas.elements : [];

  return [importClause?.name, ...elementos.map((elemento) => elemento.name)].filter(Boolean);
}

export const especificadoresImportados = (fonte) =>
  new Map(
    fonte.statements
      .filter(ts.isImportDeclaration)
      .flatMap((declaracao) =>
        nomesImportados(declaracao).map((nome) => [nome.text, textoLiteral(declaracao.moduleSpecifier)]),
      ),
  );

export function percorrer(no, visitar) {
  visitar(no);
  ts.forEachChild(no, (filho) => percorrer(filho, visitar));
}

export function componenteDoJsx(expressao) {
  const abertura =
    expressao !== undefined && ts.isJsxElement(expressao) ? expressao.openingElement : expressao;
  const ehAbertura =
    abertura !== undefined && (ts.isJsxSelfClosingElement(abertura) || ts.isJsxOpeningElement(abertura));

  return ehAbertura && ts.isIdentifier(abertura.tagName) ? abertura.tagName.text : undefined;
}
