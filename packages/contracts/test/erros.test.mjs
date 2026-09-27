import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import { CODIGOS_DE_ERRO } from '../dist/index.js';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const caminhoDoEsquema = resolve(aquiDir, '../../../docs/sql/cdd-07-esquema.sql');

const PADRAO_DE_RAISE_EXCEPTION = /raise\s+exception/gi;
const PADRAO_DE_CODIGO_CANONICO = /^\s*'([A-Z]+(?:_[A-Z]+)*): /;
const TAMANHO_DA_JANELA_APOS_O_RAISE = 200;

function numeroDaLinha(sql, indice) {
  return sql.slice(0, indice).split('\n').length;
}

function analisarRaiseExceptionDoEsquema(caminho) {
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
      naoConformes.push(`linha ${numeroDaLinha(sql, ocorrencia.index)}: ${resto.slice(0, 40).replace(/\n/g, '\\n')}`);
    }
  }

  return { total: ocorrencias.length, codigos, naoConformes };
}

test('códigos de erro são únicos', () => {
  assert.equal(new Set(CODIGOS_DE_ERRO).size, CODIGOS_DE_ERRO.length);
});

test('códigos de erro seguem o formato MAIUSCULAS_COM_SUBLINHADO', () => {
  for (const codigo of CODIGOS_DE_ERRO) {
    assert.match(codigo, /^[A-Z]+(?:_[A-Z]+)*$/, codigo);
  }
});

test('todo RAISE EXCEPTION do esquema de referência segue o formato canônico com código do catálogo', () => {
  const { total, codigos, naoConformes } = analisarRaiseExceptionDoEsquema(caminhoDoEsquema);

  assert.ok(total > 0, 'nenhum RAISE EXCEPTION encontrado no esquema de referência');
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
