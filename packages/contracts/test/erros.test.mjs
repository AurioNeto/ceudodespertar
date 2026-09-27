import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { CODIGOS_DE_ERRO } from '../dist/index.js';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const diretorioDasMigracoes = resolve(aquiDir, '../../../apps/api/src/banco/migracoes');

const PADRAO_DE_ARQUIVO_ELEGIVEL = /\.(sql|ts)$/i;
const NIVEIS_SEM_EXCECAO = new Set(['debug', 'log', 'info', 'notice', 'warning']);
const PADRAO_DE_PALAVRA_RAISE = /\braise\b/gi;
const PADRAO_DE_PALAVRA_ASSERT = /\bassert\b/gi;
const PADRAO_DE_PROXIMA_PALAVRA = /^\s*([a-zA-Z]+)\b/;
const PADRAO_DA_FORMA_CANONICA =
  /^\s*'([A-Z]+(?:_[A-Z]+)*): [^']*'(?:\s*,[^;]*?)?\s*USING\s+ERRCODE\s*=\s*'P0001'\s*;/;
const TAMANHO_DA_JANELA_DE_DIAGNOSTICO = 80;

function arquivosDasMigracoes(diretorio) {
  const entradas = readdirSync(diretorio, { withFileTypes: true });
  const arquivos = [];
  for (const entrada of entradas) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...arquivosDasMigracoes(caminho));
    } else if (PADRAO_DE_ARQUIVO_ELEGIVEL.test(entrada.name)) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

function numeroDaLinha(sql, indice) {
  return sql.slice(0, indice).split('\n').length;
}

function trechoDeDiagnostico(sql, indice) {
  return sql.slice(indice, indice + TAMANHO_DA_JANELA_DE_DIAGNOSTICO).replace(/\n/g, '\\n');
}

function analisarArquivo(caminho) {
  const sql = readFileSync(caminho, 'utf8');
  const codigos = new Set();
  const naoConformes = [];
  let totalDeExcecoes = 0;

  for (const ocorrencia of sql.matchAll(PADRAO_DE_PALAVRA_ASSERT)) {
    naoConformes.push(`${caminho}:${numeroDaLinha(sql, ocorrencia.index)}: ASSERT não é uma forma aceita de erro`);
  }

  for (const ocorrencia of sql.matchAll(PADRAO_DE_PALAVRA_RAISE)) {
    let cursor = ocorrencia.index + ocorrencia[0].length;
    const proximaPalavra = sql.slice(cursor).match(PADRAO_DE_PROXIMA_PALAVRA);
    const nivel = proximaPalavra?.[1]?.toLowerCase();

    if (nivel && NIVEIS_SEM_EXCECAO.has(nivel)) {
      continue;
    }
    if (nivel === 'exception') {
      cursor += proximaPalavra[0].length;
    }

    totalDeExcecoes += 1;
    const resto = sql.slice(cursor);
    const casamento = resto.match(PADRAO_DA_FORMA_CANONICA);

    if (!casamento) {
      naoConformes.push(
        `${caminho}:${numeroDaLinha(sql, ocorrencia.index)}: ${trechoDeDiagnostico(sql, ocorrencia.index)}`,
      );
      continue;
    }
    codigos.add(casamento[1]);
  }

  return { totalDeExcecoes, codigos, naoConformes };
}

function analisarRaiseExceptionDasMigracoes() {
  let totalDeExcecoes = 0;
  const codigos = new Set();
  const naoConformes = [];

  for (const arquivo of arquivosDasMigracoes(diretorioDasMigracoes)) {
    const analise = analisarArquivo(arquivo);
    totalDeExcecoes += analise.totalDeExcecoes;
    for (const codigo of analise.codigos) codigos.add(codigo);
    naoConformes.push(...analise.naoConformes);
  }

  return { totalDeExcecoes, codigos, naoConformes };
}

test('códigos de erro são únicos', () => {
  assert.equal(new Set(CODIGOS_DE_ERRO).size, CODIGOS_DE_ERRO.length);
});

test('códigos de erro seguem o formato MAIUSCULAS_COM_SUBLINHADO', () => {
  for (const codigo of CODIGOS_DE_ERRO) {
    assert.match(codigo, /^[A-Z]+(?:_[A-Z]+)*$/, codigo);
  }
});

test('toda RAISE de nível EXCEPTION (implícito ou explícito) das migrations segue a forma canônica', () => {
  const { totalDeExcecoes, codigos, naoConformes } = analisarRaiseExceptionDasMigracoes();

  assert.ok(totalDeExcecoes > 0, 'nenhuma RAISE de nível EXCEPTION encontrada nas migrations');
  assert.deepEqual(
    naoConformes,
    [],
    `RAISE fora da forma canônica "CODIGO: mensagem" ... USING ERRCODE = 'P0001': ${naoConformes.join('; ')}`,
  );

  const catalogo = new Set(CODIGOS_DE_ERRO);
  for (const codigo of codigos) {
    assert.ok(catalogo.has(codigo), `${codigo} não está no catálogo`);
  }
});
