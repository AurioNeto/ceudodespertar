import type { EntityManager } from '@mikro-orm/postgresql';

export async function encerrar(em: EntityManager) {
  await em.execute('rollback; select 1');
  await em.execute('COMMIT');
  await em.execute('rollback; set default_transaction_read_only = on');
}
