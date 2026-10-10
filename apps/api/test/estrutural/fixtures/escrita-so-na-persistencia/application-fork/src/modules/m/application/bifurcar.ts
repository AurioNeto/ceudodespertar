import type { EntityManager } from '@mikro-orm/postgresql';

export function bifurcar(em: EntityManager) {
  return em.fork();
}
