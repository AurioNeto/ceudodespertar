import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
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
const diretorioDasMigracoes = resolve(aquiDir, '../../../apps/api/src/banco/migracoes');

const PADRAO_DE_ARQUIVO_ELEGIVEL = /\.(sql|ts)$/i;
const NOME_DA_TABELA = String.raw`"?identidade"?\s*\.\s*"?permissao"?`;
const PADRAO_DE_ESCRITA_NA_TABELA = new RegExp(
  String.raw`\b(insert\s+into|update|delete\s+from|copy)\s+${NOME_DA_TABELA}\b`,
  'gi',
);
const PADRAO_DE_ABERTURA_DE_TUPLA = /\(\s*'/g;
const PADRAO_DE_TUPLA = /\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/g;

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

function corpoDoStatement(sql, indiceAposMatch) {
  const fimDoStatement = sql.indexOf(';', indiceAposMatch);
  return fimDoStatement === -1 ? sql.slice(indiceAposMatch) : sql.slice(indiceAposMatch, fimDoStatement);
}

function analisarInsert(caminho, linha, corpo, naoConformes, linhasInseridas) {
  if (/\bselect\b/i.test(corpo)) {
    naoConformes.push(`${caminho}:${linha}: INSERT ... SELECT não é um INSERT literal em identidade.permissao`);
    return;
  }

  const indiceDeValues = corpo.search(/\bvalues\b/i);
  if (indiceDeValues === -1) {
    naoConformes.push(`${caminho}:${linha}: INSERT em identidade.permissao sem VALUES literal`);
    return;
  }

  const secaoDeValores = corpo.slice(indiceDeValues);
  const aberturas = secaoDeValores.match(PADRAO_DE_ABERTURA_DE_TUPLA) ?? [];
  const tuplas = [...secaoDeValores.matchAll(PADRAO_DE_TUPLA)];
  if (tuplas.length !== aberturas.length) {
    naoConformes.push(
      `${caminho}:${linha}: tupla do INSERT em identidade.permissao com formatação divergente do padrão esperado`,
    );
    return;
  }

  for (const tupla of tuplas) {
    linhasInseridas.push({ codigo: tupla[1], modulo: tupla[2], descricao: tupla[3] });
  }
}

function analisarArquivo(caminho) {
  const ehDesfazer = caminho.endsWith('desfazer.sql');
  const sql = readFileSync(caminho, 'utf8');
  const naoConformes = [];
  const linhasInseridas = [];

  for (const ocorrencia of sql.matchAll(PADRAO_DE_ESCRITA_NA_TABELA)) {
    const verbo = ocorrencia[1].toLowerCase().replace(/\s+/g, ' ');
    const linha = numeroDaLinha(sql, ocorrencia.index);
    const corpo = corpoDoStatement(sql, ocorrencia.index + ocorrencia[0].length);

    if (verbo === 'insert into') {
      analisarInsert(caminho, linha, corpo, naoConformes, linhasInseridas);
      continue;
    }

    if (verbo === 'delete from' && ehDesfazer) {
      if (!/\bwhere\b/i.test(corpo)) {
        naoConformes.push(
          `${caminho}:${linha}: DELETE em identidade.permissao no desfazer sem WHERE apagaria seeds futuros`,
        );
      }
      continue;
    }

    naoConformes.push(`${caminho}:${linha}: ${verbo.toUpperCase()} em identidade.permissao fora de um INSERT literal ou do desfazer`);
  }

  return { naoConformes, linhasInseridas };
}

function escritasNaTabelaDasMigracoes() {
  const naoConformes = [];
  const linhasInseridas = [];
  for (const arquivo of arquivosDasMigracoes(diretorioDasMigracoes)) {
    const analise = analisarArquivo(arquivo);
    naoConformes.push(...analise.naoConformes);
    linhasInseridas.push(...analise.linhasInseridas);
  }
  assert.ok(linhasInseridas.length > 0, 'INSERT INTO identidade.permissao não encontrado nas migrations');
  return { naoConformes, linhasInseridas };
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

test('T29(c) — o INSERT das migrations é igual ao catálogo, em código, módulo e descrição', () => {
  const { naoConformes, linhasInseridas } = escritasNaTabelaDasMigracoes();
  assert.deepEqual(naoConformes, [], naoConformes.join('; '));

  const codigosDoSql = linhasInseridas.map((linha) => linha.codigo);
  assert.equal(new Set(codigosDoSql).size, codigosDoSql.length, 'código duplicado no INSERT das migrations');

  const codigosDoCatalogo = Object.keys(CATALOGO_DE_PERMISSOES);
  assert.equal(codigosDoSql.length, codigosDoCatalogo.length);
  assert.deepEqual(new Set(codigosDoSql), new Set(codigosDoCatalogo));

  for (const linha of linhasInseridas) {
    const doContrato = CATALOGO_DE_PERMISSOES[linha.codigo];
    assert.ok(doContrato, `${linha.codigo} não está no catálogo do contracts`);
    assert.ok(linha.descricao.trim().length > 0, `${linha.codigo}: descrição vazia`);
    assert.equal(linha.modulo, linha.codigo.split('.')[0], `${linha.codigo}: módulo "${linha.modulo}" não é o prefixo do código`);
    assert.equal(linha.modulo, doContrato.modulo, `${linha.codigo}: módulo diverge do contracts`);
    assert.equal(linha.descricao, doContrato.descricao, `${linha.codigo}: descrição diverge do contracts`);
  }
});

test('os seis grupos de sistema não incluem GUARDIAO', () => {
  assert.deepEqual(
    CODIGOS_DE_GRUPO_DE_SISTEMA.toSorted(),
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
