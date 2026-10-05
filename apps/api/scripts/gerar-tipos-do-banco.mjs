#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { MikroORM } from '@mikro-orm/postgresql';
import { construirOpcoesDoMigrador } from '../dist/banco/opcoes-do-migrador.js';

const IMAGEM_POSTGRES = 'postgres:16.15-bookworm';
const USUARIO_SUPERUSUARIO = 'postgres';
const SENHA_SUPERUSUARIO = 'postgres-gerar-tipos';
const BANCO_DE_ADMINISTRACAO = 'postgres';
const BANCO_ALVO = 'cdd_gerar_tipos';
const SENHA_CDD_OWNER = 'cdd-owner-gerar-tipos';

const diretorioDoPacote = dirname(dirname(fileURLToPath(import.meta.url)));

function caminhoDosPapeisDeCluster() {
  return join(diretorioDoPacote, '../../infra/postgres/papeis.sql');
}

async function aplicarPapeisDeCluster(superusuario) {
  const papeisDeCluster = readFileSync(caminhoDosPapeisDeCluster(), 'utf8');
  await superusuario.query(papeisDeCluster);
  await superusuario.query(`ALTER ROLE cdd_owner PASSWORD '${SENHA_CDD_OWNER}'`);
}

async function criarEMigrarBancoAlvo(superusuario, host, porta) {
  await superusuario.query(`CREATE DATABASE ${BANCO_ALVO} OWNER cdd_owner TEMPLATE template0 ENCODING 'UTF8'`);

  const urlDeMigracao = `postgres://cdd_owner:${SENHA_CDD_OWNER}@${host}:${porta}/${BANCO_ALVO}`;
  const orm = await MikroORM.init(construirOpcoesDoMigrador({ BANCO_URL_MIGRACAO: urlDeMigracao }));
  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }

  return urlDeMigracao;
}

async function subirBancoMigrado() {
  const container = await new PostgreSqlContainer(IMAGEM_POSTGRES)
    .withUsername(USUARIO_SUPERUSUARIO)
    .withPassword(SENHA_SUPERUSUARIO)
    .withDatabase(BANCO_DE_ADMINISTRACAO)
    .start();

  const host = container.getHost();
  const porta = container.getPort();

  const superusuario = new Client({
    host,
    port: porta,
    user: USUARIO_SUPERUSUARIO,
    password: SENHA_SUPERUSUARIO,
    database: BANCO_DE_ADMINISTRACAO,
  });
  await superusuario.connect();

  try {
    await aplicarPapeisDeCluster(superusuario);
    const urlDoBancoOwner = await criarEMigrarBancoAlvo(superusuario, host, porta);
    return { container, urlDoBancoOwner };
  } catch (erroAoPreparar) {
    await container.stop();
    throw erroAoPreparar;
  } finally {
    await superusuario.end();
  }
}

function rodarKyselyCodegen(urlDoBancoOwner, { verificar }) {
  const argumentos = ['exec', 'kysely-codegen', '--url', urlDoBancoOwner];
  if (verificar) {
    argumentos.push('--verify', '--log-level', 'error');
  }

  const resultado = spawnSync('pnpm', argumentos, {
    cwd: diretorioDoPacote,
    stdio: 'inherit',
  });

  if (resultado.status !== 0) {
    throw new Error(
      verificar
        ? 'Os tipos gerados a partir do banco migrado divergem do arquivo commitado ' +
          '(apps/api/src/shared/infrastructure/banco/banco-cdd.gerado.ts). ' +
          'Rode "pnpm --filter @cdd/api db:gerar-tipos" e commite o resultado.'
        : 'kysely-codegen falhou ao gerar os tipos.',
    );
  }
}

async function main() {
  const verificar = process.argv.includes('--verificar');

  const { container, urlDoBancoOwner } = await subirBancoMigrado();
  try {
    rodarKyselyCodegen(urlDoBancoOwner, { verificar });
  } finally {
    await container.stop();
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
