import type { EntityManager } from '@mikro-orm/postgresql';

export async function despachar(em: EntityManager) {
  await em.execute('rollback; set default_transaction_read_only = on');
  await em.execute('commit');
}
