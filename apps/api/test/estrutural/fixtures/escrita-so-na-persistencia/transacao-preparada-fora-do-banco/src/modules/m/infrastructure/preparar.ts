import type { EntityManager } from '@mikro-orm/postgresql';

export async function preparar(em: EntityManager) {
  await em.execute("prepare transaction 'x'");
  await em.execute("commit prepared 'x'");
  await em.execute("rollback prepared 'x'");
}
