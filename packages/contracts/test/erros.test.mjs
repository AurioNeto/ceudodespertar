import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { CODIGOS_DE_ERRO } from '../dist/index.js';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const diretorioDasMigracoes = resolve(aquiDir, '../../../apps/api/src/banco/migracoes');

const PADRAO_DE_RAISE_EXCEPTION = /raise\s+exception/gi;
const PADRAO_DE_CODIGO_CANONICO = /^\s*'([A-Z]+(?:_[A-Z]+)*): /;
const TAMANHO_DA_JANELA_APOS_O_RAISE = 200;

function arquivosSqlDasMigracoes(diretorio) {
  const entradas = readdirSync(diretorio, { withFileTypes: true });
  const arquivos = [];
  for (const entrada of entradas) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      arquivos.push(...arquivosSqlDasMigracoes(caminho));
    } else if (entrada.name.endsWith('.sql')) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

function numeroDaLinha(sql, indice) {
  return sql.slice(0, indice).split('\n').length;
}

function analisarRaiseExceptionDoArquivo(caminho) {
  const sql = readFileSync(caminho, 'utf8');
  const ocorrencias = [...sql.matchAll(PADRAO_DE_RAISE_EXCEPTION)];

  const codigos = new Set();
  const naoConformes = [];

  for (const ocorrencia of ocorrencias) {
    const inicioDoResto = ocorrencia.index + ocorrencia[0].length;
    const resto = sql.slice(inicioDoResto, inicioDoResto + TAMANHO_DA_JANELA_APOS_O_RAISE);
    const casamentoDoCodigo = resto.match(PADRAO_DE_CODIGO_CANONICO);

    if (casamentoDoCodigo) {
      codigos.add(casamentoDoCodigo[1]);
    } else {
      naoConformes.push(
        `${caminho}:${numeroDaLinha(sql, ocorrencia.index)}: ${resto.slice(0, 40).replace(/\n/g, '\\n')}`,
      );
    }
  }

  return { total: ocorrencias.length, codigos, naoConformes };
}

function analisarRaiseExceptionDasMigracoes() {
  const arquivos = arquivosSqlDasMigracoes(diretorioDasMigracoes);
  let total = 0;
  const codigos = new Set();
  const naoConformes = [];

  for (const arquivo of arquivos) {
    const analise = analisarRaiseExceptionDoArquivo(arquivo);
    total += analise.total;
    for (const codigo of analise.codigos) codigos.add(codigo);
    naoConformes.push(...analise.naoConformes);
  }

  return { total, codigos, naoConformes };
}

test('códigos de erro são únicos', () => {
  assert.equal(new Set(CODIGOS_DE_ERRO).size, CODIGOS_DE_ERRO.length);
});

test('códigos de erro seguem o formato MAIUSCULAS_COM_SUBLINHADO', () => {
  for (const codigo of CODIGOS_DE_ERRO) {
    assert.match(codigo, /^[A-Z]+(?:_[A-Z]+)*$/, codigo);
  }
});

test('todo RAISE EXCEPTION das migrations segue o formato canônico com código do catálogo', () => {
  const { total, codigos, naoConformes } = analisarRaiseExceptionDasMigracoes();

  assert.ok(total > 0, 'nenhum RAISE EXCEPTION encontrado nas migrations');
  assert.deepEqual(
    naoConformes,
    [],
    `RAISE EXCEPTION fora do formato canônico 'CODIGO: mensagem': ${naoConformes.join('; ')}`,
  );

  const catalogo = new Set(CODIGOS_DE_ERRO);
  for (const codigo of codigos) {
    assert.ok(catalogo.has(codigo), `${codigo} não está no catálogo`);
  }
});
