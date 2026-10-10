import type { EntityManager } from '@mikro-orm/postgresql';

export async function variavel(em: EntityManager) {
  let consulta = 'select 1';
  consulta = 'update t set a = 1';
  await em.execute(consulta);
}
