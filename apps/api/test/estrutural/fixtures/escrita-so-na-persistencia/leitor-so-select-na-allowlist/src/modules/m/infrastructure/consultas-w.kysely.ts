import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export async function consultar(kysely: Kysely<any>, em: EntityManager) {
  await sql.raw('SELECT 1;').execute(kysely);
  await sql.raw('select 1; select 2').execute(kysely);
  await sql.raw('/* nota */ select 1 -- fim').execute(kysely);
  await sql`with a as (select 1) select * from a`.execute(kysely);
  await em.execute('select 1');
  await kysely.selectFrom('t').select(sql.raw('lock_nome').as('lock_nome')).orderBy(sql`notify_ordem`).execute();
}
