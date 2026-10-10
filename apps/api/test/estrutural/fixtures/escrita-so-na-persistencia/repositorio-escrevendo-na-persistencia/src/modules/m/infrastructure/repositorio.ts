import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';
import { Entidade } from './entidade.js';

export async function salvar(em: EntityManager, kysely: Kysely<any>) {
  const criada = em.create(Entidade, {});
  em.assign(criada, {});
  em.persist(criada);
  await em.flush();
  await kysely.insertInto('t').values({ a: 1 }).execute();
  await em.execute('insert into t values (1)');
}
