import type { EntityManager } from '@mikro-orm/postgresql';

export async function controlar(em: EntityManager) {
  await em.execute('begin');
  await em.execute('commit');
  await em.execute('rollback');
}
