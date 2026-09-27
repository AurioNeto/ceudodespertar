import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import { CODIGOS_DE_ERRO } from '../dist/index.js';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const caminhoDoEsquema = resolve(aquiDir, '../../../docs/sql/cdd-07-esquema.sql');

function prefixosDeRaiseExceptionDoEsquema(caminho) {
  const sql = readFileSync(caminho, 'utf8');
  const casamentos = [...sql.matchAll(/RAISE EXCEPTION '([A-Z_]+):/g)];
  return new Set(casamentos.map((casamento) => casamento[1]));
}

test('códigos de erro são únicos', () => {
  assert.equal(new Set(CODIGOS_DE_ERRO).size, CODIGOS_DE_ERRO.length);
});

test('códigos de erro seguem o formato MAIUSCULAS_COM_SUBLINHADO', () => {
  for (const codigo of CODIGOS_DE_ERRO) {
    assert.match(codigo, /^[A-Z]+(?:_[A-Z]+)*$/, codigo);
  }
});

test('todo prefixo de RAISE EXCEPTION do esquema de referência está no catálogo', () => {
  const prefixos = prefixosDeRaiseExceptionDoEsquema(caminhoDoEsquema);
  assert.ok(prefixos.size > 0, 'nenhum RAISE EXCEPTION com prefixo encontrado no esquema de referência');

  const catalogo = new Set(CODIGOS_DE_ERRO);
  for (const prefixo of prefixos) {
    assert.ok(catalogo.has(prefixo), `${prefixo} não está no catálogo`);
  }
});
