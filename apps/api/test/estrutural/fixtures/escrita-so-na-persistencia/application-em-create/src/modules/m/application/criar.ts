import type { EntityManager } from '@mikro-orm/postgresql';

class Entidade {}

export function criar(em: EntityManager) {
  return em.create(Entidade, {});
}
