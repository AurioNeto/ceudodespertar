import type { EntityManager } from '@mikro-orm/postgresql';

export async function executar(em: EntityManager) {
  await em.execute('update t set a = 1');
}
