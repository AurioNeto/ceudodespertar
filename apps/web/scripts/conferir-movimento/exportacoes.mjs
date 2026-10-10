import ts from 'typescript';
import { nomesDeclarados } from './declaracoes.mjs';
import {
  alvoDeDeclaracao,
  alvoDoModuloResolvido,
  alvoExterno,
  NOME_PADRAO,
} from './alvos.mjs';
import { alvoDoNome, nomeDoElemento } from './importacoes.mjs';

const NOME_DA_EXPORTACAO_IGUAL = 'export=';
const PREFIXO_DA_ESTRELA_EXTERNA = '*externo:';

const entrada = (alvo, apenasTipo = false) => ({ alvo, apenasTipo });

const temModificador = (statement, tipoDoModificador) =>
  statement.modifiers?.some((modificador) => modificador.kind === tipoDoModificador) ?? false;

const ehExportada = (statement) => temModificador(statement, ts.SyntaxKind.ExportKeyword);

const ehEstrela = (statement) =>
  ts.isExportDeclaration(statement) && statement.moduleSpecifier && !statement.exportClause;

function alvoLocal(leitor, arquivo, nome) {
  const importada = leitor
    .importacoes(arquivo)
    .find((ligacaoDoArquivo) => ligacaoDoArquivo.categoria === 'importacao' && ligacaoDoArquivo.nome === nome);

  return importada?.alvo ?? alvoDeDeclaracao(arquivo, nome);
}

function entradasDeDeclaracao(arquivo, statement) {
  const nomes = nomesDeclarados(statement);

  return temModificador(statement, ts.SyntaxKind.DefaultKeyword)
    ? [[NOME_PADRAO, entrada(alvoDeDeclaracao(arquivo, nomes[0] ?? NOME_PADRAO))]]
    : nomes.map((nome) => [nome, entrada(alvoDeDeclaracao(arquivo, nome))]);
}

function entradasDeListaLocal(leitor, arquivo, statement) {
  const { exportClause } = statement;

  if (!exportClause || !ts.isNamedExports(exportClause)) {
    return [];
  }

  return exportClause.elements.map((elemento) => [
    elemento.name.text,
    entrada(alvoLocal(leitor, arquivo, nomeDoElemento(elemento)), statement.isTypeOnly || elemento.isTypeOnly),
  ]);
}

function entradasDeReexportacao(leitor, arquivo, statement) {
  const { exportClause } = statement;
  const modulo = leitor.resolver(statement.moduleSpecifier.text, arquivo);

  if (ts.isNamespaceExport(exportClause)) {
    return [[exportClause.name.text, entrada(alvoDoModuloResolvido(modulo), statement.isTypeOnly)]];
  }

  return exportClause.elements.map((elemento) => [
    elemento.name.text,
    entrada(
      alvoDoNome(leitor, modulo, nomeDoElemento(elemento)),
      statement.isTypeOnly || elemento.isTypeOnly,
    ),
  ]);
}

function entradasDeEstrela(leitor, arquivo, statement) {
  const modulo = leitor.resolver(statement.moduleSpecifier.text, arquivo);

  if (modulo.externo !== undefined) {
    const alvo = alvoExterno(modulo.externo, '*');

    return [[`${PREFIXO_DA_ESTRELA_EXTERNA}${modulo.externo}`, entrada(alvo, statement.isTypeOnly)]];
  }

  return [...leitor.exportacoesPorNome(modulo.arquivo)]
    .filter(([nome]) => nome !== NOME_PADRAO)
    .map(([nome, existente]) => [
      nome,
      entrada(existente.alvo, statement.isTypeOnly || existente.apenasTipo),
    ]);
}

function entradasDoStatement(leitor, arquivo, statement) {
  if (ts.isExportDeclaration(statement)) {
    if (!statement.moduleSpecifier) {
      return entradasDeListaLocal(leitor, arquivo, statement);
    }

    return statement.exportClause ? entradasDeReexportacao(leitor, arquivo, statement) : [];
  }

  if (ts.isExportAssignment(statement)) {
    const nome = statement.isExportEquals ? NOME_DA_EXPORTACAO_IGUAL : NOME_PADRAO;
    const alvo = ts.isIdentifier(statement.expression)
      ? alvoLocal(leitor, arquivo, statement.expression.text)
      : alvoDeDeclaracao(arquivo, NOME_PADRAO);

    return [[nome, entrada(alvo)]];
  }

  return ehExportada(statement) ? entradasDeDeclaracao(arquivo, statement) : [];
}

export function exportacoesDoArquivo(leitor, arquivo) {
  const { statements } = leitor.fonte(arquivo);
  const exportacoes = new Map(
    statements.flatMap((statement) => entradasDoStatement(leitor, arquivo, statement)),
  );

  for (const statement of statements.filter(ehEstrela)) {
    for (const [nome, existente] of entradasDeEstrela(leitor, arquivo, statement)) {
      if (!exportacoes.has(nome)) {
        exportacoes.set(nome, existente);
      }
    }
  }

  return exportacoes;
}
