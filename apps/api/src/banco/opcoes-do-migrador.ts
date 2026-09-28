import { defineConfig } from '@mikro-orm/postgresql';
import type { Options } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { analisarAmbienteDoMigrador } from './ambiente-do-migrador.js';
import { MIGRACOES_DO_CDD } from './migracoes/lista.js';

export const TABELA_DE_HISTORICO_DO_MIGRADOR = 'cdd_migracoes_aplicadas';
export const SCHEMA_DA_TABELA_DE_HISTORICO = 'public';

const PORTA_PADRAO_DO_POSTGRES = 5432;

export interface ConexaoExplicita {
  readonly host: string;
  readonly port: number;
  readonly dbName: string;
  readonly user: string;
  readonly password: string;
}

export function extrairConexaoExplicitaDaUrl(urlDeConexao: string): ConexaoExplicita {
  const url = new URL(urlDeConexao);
  return {
    host: decodeURIComponent(url.hostname),
    port: url.port === '' ? PORTA_PADRAO_DO_POSTGRES : Number(url.port),
    dbName: decodeURIComponent(url.pathname).replace(/^\//, ''),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

export function construirOpcoesDoMigrador(bruto: NodeJS.ProcessEnv = process.env): Options {
  const ambiente = analisarAmbienteDoMigrador(bruto);
  const conexao = extrairConexaoExplicitaDaUrl(ambiente.BANCO_URL_MIGRACAO);

  return defineConfig({
    ...conexao,
    schema: SCHEMA_DA_TABELA_DE_HISTORICO,
    entities: [],
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    ensureDatabase: false,
    migrations: {
      tableName: TABELA_DE_HISTORICO_DO_MIGRADOR,
      schema: SCHEMA_DA_TABELA_DE_HISTORICO,
      migrationsList: MIGRACOES_DO_CDD,
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      snapshot: false,
    },
  });
}
