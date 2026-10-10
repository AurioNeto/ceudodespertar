import type { EntityManager } from '@mikro-orm/postgresql';

class Entidade {}

export async function apagar(em: EntityManager) {
  await em['nativeDelete'](Entidade, {});
}
