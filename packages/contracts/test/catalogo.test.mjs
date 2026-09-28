import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';

import {
  AlterarGruposDoUsuario,
  AtivarConvite,
  CATALOGO_DE_PERMISSOES,
  CODIGOS_DE_GRUPO_DE_SISTEMA,
  ConvidarUsuario,
  DesativarUsuario,
  PERMISSOES,
  ReativarUsuario,
} from '../dist/index.js';

const aquiDir = dirname(fileURLToPath(import.meta.url));
const caminhoDoEsquema = resolve(aquiDir, '../../../docs/sql/cdd-07-esquema.sql');

function blocosDeInsertDeReferencia() {
  const sql = readFileSync(caminhoDoEsquema, 'utf8');
  const casamentos = sql.matchAll(/INSERT INTO identidade\.permissao[^;]*;/gs);
  const blocos = [...casamentos].map((casamento) => casamento[0]);
  assert.ok(blocos.length > 0, 'INSERT INTO identidade.permissao não encontrado no esquema de referência');
  return blocos;
}

function codigosDoInsertDeReferencia() {
  const blocos = blocosDeInsertDeReferencia();
  const codigos = [];
  for (const bloco of blocos) {
    const ocorrenciasDeAberturaDeTupla = bloco.split("('").length - 1;
    const casamentos = [...bloco.matchAll(/\(\s*'([^']+)'/g)];
    assert.equal(
      casamentos.length,
      ocorrenciasDeAberturaDeTupla,
      'tupla do INSERT com formatação divergente do padrão esperado',
    );
    for (const casamento of casamentos) codigos.push(casamento[1]);
  }
  return codigos;
}

test('catálogo tem 64 códigos únicos no formato modulo.recurso.acao', () => {
  const codigos = Object.keys(CATALOGO_DE_PERMISSOES);
  assert.equal(codigos.length, 64);
  assert.equal(new Set(codigos).size, 64);

  for (const codigo of codigos) {
    assert.match(codigo, /^[a-z]+(?:_[a-z]+)*\.[a-z]+(?:_[a-z]+)*\.[a-z]+(?:_[a-z]+)*$/, codigo);
    const [modulo] = codigo.split('.');
    assert.equal(CATALOGO_DE_PERMISSOES[codigo].modulo, modulo, codigo);
  }
});

test('PERMISSOES tem exatamente as chaves do catálogo', () => {
  const chavesDoCatalogo = new Set(Object.keys(CATALOGO_DE_PERMISSOES));
  assert.equal(PERMISSOES.length, chavesDoCatalogo.size);
  assert.equal(new Set(PERMISSOES).size, PERMISSOES.length);
  for (const permissao of PERMISSOES) {
    assert.ok(chavesDoCatalogo.has(permissao), permissao);
  }
});

test('T29(c) — o INSERT do esquema de referência é igual ao catálogo', () => {
  const codigosDoSql = codigosDoInsertDeReferencia();
  const codigosDoCatalogo = Object.keys(CATALOGO_DE_PERMISSOES);
  assert.equal(codigosDoSql.length, codigosDoCatalogo.length);
  assert.deepEqual(new Set(codigosDoSql), new Set(codigosDoCatalogo));
});

test('os seis grupos de sistema não incluem GUARDIAO', () => {
  assert.deepEqual(
    [...CODIGOS_DE_GRUPO_DE_SISTEMA].sort(),
    ['ACOLHIMENTO', 'ADMINISTRADOR', 'GOVERNANCA', 'LEITURA', 'REGISTRO', 'TESOURARIA'],
  );
  assert.ok(!CODIGOS_DE_GRUPO_DE_SISTEMA.includes('GUARDIAO'));
});

test('ConvidarUsuario aceita exemplo válido e recusa e-mail inválido', () => {
  assert.equal(ConvidarUsuario.safeParse({ nome: 'Ana Beatriz', email: 'ana@exemplo.org' }).success, true);
  assert.equal(ConvidarUsuario.safeParse({ nome: 'Ana Beatriz', email: 'não-é-email' }).success, false);
  assert.equal(ConvidarUsuario.safeParse({ nome: '', email: 'ana@exemplo.org' }).success, false);
});

const grupoIdA = '550e8400-e29b-41d4-a716-446655440000';
const grupoIdB = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

test('AlterarGruposDoUsuario aceita lista vazia e UUIDs distintos', () => {
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos: [] }).success, true);
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos: [grupoIdA, grupoIdB] }).success, true);
});

test('AlterarGruposDoUsuario recusa item que não é UUID', () => {
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos: [''] }).success, false);
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos: ['grupo-1'] }).success, false);
});

test('AlterarGruposDoUsuario recusa UUIDs duplicados', () => {
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos: [grupoIdA, grupoIdA] }).success, false);
});

test('AlterarGruposDoUsuario recusa mais grupos que o limite permitido', () => {
  const grupos = Array.from({ length: 101 }, (_, indice) =>
    `00000000-0000-4000-8000-${String(indice).padStart(12, '0')}`,
  );
  assert.equal(AlterarGruposDoUsuario.safeParse({ grupos }).success, false);
});

test('DesativarUsuario e ReativarUsuario exigem motivo entre 1 e 500 caracteres', () => {
  assert.equal(DesativarUsuario.safeParse({ motivo: 'Afastamento definitivo' }).success, true);
  assert.equal(DesativarUsuario.safeParse({ motivo: '' }).success, false);
  assert.equal(DesativarUsuario.safeParse({ motivo: 'x'.repeat(501) }).success, false);

  assert.equal(ReativarUsuario.safeParse({ motivo: 'Retorno confirmado' }).success, true);
  assert.equal(ReativarUsuario.safeParse({ motivo: '   ' }).success, false);
});

test('AtivarConvite exige token não vazio', () => {
  assert.equal(AtivarConvite.safeParse({ token: 'a1b2c3' }).success, true);
  assert.equal(AtivarConvite.safeParse({ token: '' }).success, false);
});

test('AtivarConvite recusa token acima de 512 caracteres', () => {
  assert.equal(AtivarConvite.safeParse({ token: 'a'.repeat(512) }).success, true);
  assert.equal(AtivarConvite.safeParse({ token: 'a'.repeat(513) }).success, false);
});
