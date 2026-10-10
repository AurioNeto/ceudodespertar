import type { EntityManager } from '@mikro-orm/postgresql';

export async function travar(em: EntityManager) {
  await em.execute('lock table t');
  await em.execute('notify canal');
}
