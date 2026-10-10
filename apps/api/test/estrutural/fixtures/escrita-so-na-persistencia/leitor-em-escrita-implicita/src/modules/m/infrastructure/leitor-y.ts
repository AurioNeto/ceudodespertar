import type { EntityManager } from '@mikro-orm/postgresql';

class Entidade {}

export async function leitor(em: EntityManager) {
  const criada = em.create(Entidade, {});
  em.assign(criada, {});
  em.persist(criada);
  await em.flush();
}
