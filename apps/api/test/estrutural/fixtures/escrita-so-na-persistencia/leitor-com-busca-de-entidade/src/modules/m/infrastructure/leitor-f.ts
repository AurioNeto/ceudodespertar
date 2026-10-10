import type { EntityManager } from '@mikro-orm/postgresql';

class Entidade {}

export async function ler(em: EntityManager) {
  await em.find(Entidade, {});
  await em.findOne(Entidade, {});
  await em.findOneOrFail(Entidade, {});
  await em.findAll(Entidade);
  await em.findAndCount(Entidade, {});
  await em.findByCursor(Entidade, {});
  em.getReference(Entidade, 'a');
}
