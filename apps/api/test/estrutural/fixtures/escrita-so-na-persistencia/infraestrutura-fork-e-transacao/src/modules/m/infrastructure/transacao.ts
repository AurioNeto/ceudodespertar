import type { EntityManager } from '@mikro-orm/postgresql';

export async function transacionar(em: EntityManager) {
  const filho = em.fork();
  await filho.transactional(async () => {});
  await filho.begin();
  await filho.commit();
  await filho.rollback();
}
