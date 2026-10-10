import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { MikroORM } from '@mikro-orm/postgresql';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { construirOpcoesDoMigrador } from '../../src/banco/opcoes-do-migrador.js';

declare module 'vitest' {
  export interface ProvidedContext {
    hostDoBanco: string;
    portaDoBanco: number;
    usuarioSuperusuario: string;
    senhaSuperusuario: string;
    bancoDeAdministracao: string;
    bancoModelo: string;
    senhaCddOwner: string;
    senhaCddApp: string;
    diretorioDaExecucao: string;
  }
}

interface ProjetoDoVitest {
  provide<T>(chave: string, valor: T): void;
}

const IMAGEM_POSTGRES = 'postgres:16.15-bookworm';
const USUARIO_SUPERUSUARIO = 'postgres';
const SENHA_SUPERUSUARIO = 'postgres-teste-integracao';
const BANCO_DE_ADMINISTRACAO = 'postgres';
const BANCO_MODELO = 'cdd_modelo';
const SENHA_CDD_OWNER = 'cdd-owner-teste-integracao';
const SENHA_CDD_APP = 'cdd-app-teste-integracao';

function caminhoDosPapeisDeCluster(): string {
  const diretorioDesteArquivo = dirname(fileURLToPath(import.meta.url));
  return join(diretorioDesteArquivo, '../../../../infra/postgres/papeis.sql');
}

async function aplicarPapeisDeCluster(superusuario: Client): Promise<void> {
  const papeisDeCluster = readFileSync(caminhoDosPapeisDeCluster(), 'utf8');
  await superusuario.query(papeisDeCluster);
  await superusuario.query(
    `ALTER ROLE cdd_owner PASSWORD '${SENHA_CDD_OWNER}'; ALTER ROLE cdd_app PASSWORD '${SENHA_CDD_APP}';`,
  );
}

async function criarBancoModelo(superusuario: Client): Promise<void> {
  await superusuario.query(
    `CREATE DATABASE ${BANCO_MODELO} OWNER cdd_owner TEMPLATE template0 ENCODING 'UTF8'`,
  );
}

async function migrarBancoModelo(host: string, porta: number): Promise<void> {
  const urlDeMigracao = `postgres://cdd_owner:${SENHA_CDD_OWNER}@${host}:${porta}/${BANCO_MODELO}`;
  const orm = await MikroORM.init<PostgreSqlDriver>(
    construirOpcoesDoMigrador({ BANCO_URL_MIGRACAO: urlDeMigracao }),
  );
  try {
    await orm.migrator.up();
  } finally {
    await orm.close(true);
  }
}

async function fecharConexoesEMarcarComoModelo(superusuario: Client): Promise<void> {
  await superusuario.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${BANCO_MODELO}' AND pid <> pg_backend_pid()`,
  );
  await superusuario.query(`ALTER DATABASE ${BANCO_MODELO} WITH IS_TEMPLATE true`);
}

async function subirContainerDePostgres(): Promise<StartedPostgreSqlContainer> {
  try {
    return await new PostgreSqlContainer(IMAGEM_POSTGRES)
      .withUsername(USUARIO_SUPERUSUARIO)
      .withPassword(SENHA_SUPERUSUARIO)
      .withDatabase(BANCO_DE_ADMINISTRACAO)
      .start();
  } catch (erroAoSubirContainer) {
    throw new Error(
      'Não foi possível iniciar o container de Postgres (Testcontainers) para os testes de integração — verifique se o Docker está em execução. Os testes unitários não dependem de Docker: rode `pnpm test`.',
      { cause: erroAoSubirContainer },
    );
  }
}

export async function setup(projeto: ProjetoDoVitest): Promise<() => Promise<void>> {
  const diretorioDaExecucao = mkdtempSync(join(tmpdir(), 'cdd-execucao-'));
  const container = await subirContainerDePostgres();

  const host = container.getHost();
  const porta = container.getPort();

  try {
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
      await criarBancoModelo(superusuario);
      await migrarBancoModelo(host, porta);
      await fecharConexoesEMarcarComoModelo(superusuario);
    } finally {
      await superusuario.end();
    }
  } catch (erroNaPreparacao) {
    await container.stop();
    rmSync(diretorioDaExecucao, { recursive: true, force: true });
    throw erroNaPreparacao;
  }

  projeto.provide('hostDoBanco', host);
  projeto.provide('portaDoBanco', porta);
  projeto.provide('usuarioSuperusuario', USUARIO_SUPERUSUARIO);
  projeto.provide('senhaSuperusuario', SENHA_SUPERUSUARIO);
  projeto.provide('bancoDeAdministracao', BANCO_DE_ADMINISTRACAO);
  projeto.provide('bancoModelo', BANCO_MODELO);
  projeto.provide('senhaCddOwner', SENHA_CDD_OWNER);
  projeto.provide('senhaCddApp', SENHA_CDD_APP);
  projeto.provide('diretorioDaExecucao', diretorioDaExecucao);

  return async () => {
    await container.stop();
    rmSync(diretorioDaExecucao, { recursive: true, force: true });
  };
}
