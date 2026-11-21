import type { MikroORM, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { SCHEMA_DA_TABELA_DE_HISTORICO, TABELA_DE_HISTORICO_DO_MIGRADOR } from './opcoes-do-migrador.js';

export type OrmDoMigrador = Awaited<ReturnType<typeof MikroORM.init<PostgreSqlDriver>>>;

export async function executarMigracoes(
  orm: OrmDoMigrador,
  escopo: 'banco' | 'esquemas' = 'banco',
) {
  const aplicadas = await orm.migrator.up();
  if (escopo === 'esquemas') {
    await orm.em.execute(
      `ALTER TABLE "${SCHEMA_DA_TABELA_DE_HISTORICO}"."${TABELA_DE_HISTORICO_DO_MIGRADOR}" ENABLE ROW LEVEL SECURITY`,
    );
  }
  return aplicadas;
}
