import ts from 'typescript';
import { especificadoresDeModulo } from './declaracoes.mjs';
import {
  alvoDeDeclaracao,
  alvoDoModuloResolvido,
  alvoExterno,
  ligacao,
  NOME_PADRAO,
} from './alvos.mjs';

export const nomeDoElemento = (elemento) => (elemento.propertyName ?? elemento.name).text;

export function alvoDoNome(leitor, modulo, nome) {
  if (modulo.externo !== undefined) {
    return alvoExterno(modulo.externo, nome);
  }

  return (
    leitor.exportacoesPorNome(modulo.arquivo).get(nome)?.alvo ?? alvoDeDeclaracao(modulo.arquivo, nome)
  );
}

function ligacoesDeNomes(leitor, clausula, modulo) {
  const importar = (nome, local, apenasTipo) =>
    ligacao(
      'importacao',
      local.text,
      clausula.isTypeOnly || apenasTipo,
      alvoDoNome(leitor, modulo, nome),
    );
  const padrao = clausula.name ? [importar(NOME_PADRAO, clausula.name, false)] : [];
  const associadas = clausula.namedBindings;

  if (!associadas) {
    return padrao;
  }

  if (ts.isNamespaceImport(associadas)) {
    return [
      ...padrao,
      ligacao('importacao', associadas.name.text, clausula.isTypeOnly, alvoDoModuloResolvido(modulo)),
    ];
  }

  return [
    ...padrao,
    ...associadas.elements.map((elemento) =>
      importar(nomeDoElemento(elemento), elemento.name, elemento.isTypeOnly),
    ),
  ];
}

const importaSoTiposComTypeNoNome = ({ isTypeOnly, name, namedBindings }) =>
  !isTypeOnly &&
  !name &&
  ts.isNamedImports(namedBindings) &&
  namedBindings.elements.every((elemento) => elemento.isTypeOnly);

function ligacoesDeImportacao(leitor, arquivo, statement) {
  const modulo = leitor.resolver(statement.moduleSpecifier.text, arquivo);
  const { importClause } = statement;
  const efeito = ligacao('efeito', undefined, false, alvoDoModuloResolvido(modulo));

  if (!importClause) {
    return [efeito];
  }

  const nomes = ligacoesDeNomes(leitor, importClause, modulo);

  return importaSoTiposComTypeNoNome(importClause) ? [...nomes, efeito] : nomes;
}

const ehRequireDeModulo = (statement) =>
  ts.isImportEqualsDeclaration(statement) &&
  ts.isExternalModuleReference(statement.moduleReference) &&
  ts.isStringLiteralLike(statement.moduleReference.expression);

function ligacoesDoStatement(leitor, arquivo, statement) {
  if (ts.isImportDeclaration(statement)) {
    return ligacoesDeImportacao(leitor, arquivo, statement);
  }

  if (!ehRequireDeModulo(statement)) {
    return [];
  }

  const modulo = leitor.resolver(statement.moduleReference.expression.text, arquivo);

  return [ligacao('importacao', statement.name.text, statement.isTypeOnly, alvoDoModuloResolvido(modulo))];
}

export function importacoesDoArquivo(leitor, arquivo) {
  const fonte = leitor.fonte(arquivo);
  const carregamentos = especificadoresDeModulo(fonte).map((especificador) =>
    ligacao(
      'especificador',
      undefined,
      false,
      alvoDoModuloResolvido(leitor.resolver(especificador.text, arquivo)),
    ),
  );

  return [
    ...fonte.statements.flatMap((statement) => ligacoesDoStatement(leitor, arquivo, statement)),
    ...carregamentos,
  ];
}
