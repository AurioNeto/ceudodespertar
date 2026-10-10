import type { EntityManager } from '@mikro-orm/postgresql';

export async function consultas(em: EntityManager) {
  await em.execute('update t set a = 1');
  await em.execute('with x as (delete from t returning *) select * from x');
}
