import assert from 'node:assert/strict';
import test from 'node:test';

import { CODIGOS_DE_ERRO } from '../dist/index.js';

test('códigos de erro são únicos', () => {
  assert.equal(new Set(CODIGOS_DE_ERRO).size, CODIGOS_DE_ERRO.length);
});

test('códigos de erro seguem o formato MAIUSCULAS_COM_SUBLINHADO', () => {
  for (const codigo of CODIGOS_DE_ERRO) {
    assert.match(codigo, /^[A-Z]+(?:_[A-Z]+)*$/, codigo);
  }
});
