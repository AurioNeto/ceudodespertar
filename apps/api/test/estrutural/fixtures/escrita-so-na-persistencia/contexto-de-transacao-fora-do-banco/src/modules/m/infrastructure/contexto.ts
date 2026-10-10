import type { EntityManager } from '@mikro-orm/postgresql';

export function trocar(em: EntityManager) {
  em.setTransactionContext(undefined);
  em.resetTransactionContext();
}
