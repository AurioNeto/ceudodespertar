import { defineConfig } from '@mikro-orm/postgresql';
import type { Options } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { analisarAmbienteDoMigrador } from './ambiente-do-migrador.js';
import { MIGRACOES_DO_CDD } from './migracoes/lista.js';

export const TABELA_DE_HISTORICO_DO_MIGRADOR = 'cdd_migracoes_aplicadas';

export function construirOpcoesDoMigrador(bruto: NodeJS.ProcessEnv = process.env): Options {
  const ambiente = analisarAmbienteDoMigrador(bruto);

  return defineConfig({
    clientUrl: ambiente.BANCO_URL_MIGRACAO,
    entities: [],
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    ensureDatabase: false,
    migrations: {
      tableName: TABELA_DE_HISTORICO_DO_MIGRADOR,
      migrationsList: MIGRACOES_DO_CDD,
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      snapshot: false,
    },
  });
}
