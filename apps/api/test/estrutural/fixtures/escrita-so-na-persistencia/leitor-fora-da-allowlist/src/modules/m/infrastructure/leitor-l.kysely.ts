import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export async function leitor(kysely: Kysely<any>, em: EntityManager) {
  await sql.raw('lock table t').execute(kysely);
  await sql`notify canal`.execute(kysely);
  await em.execute('listen canal');
  await sql.raw('values (1)').execute(kysely);
  await sql.raw('explain analyze delete from t').execute(kysely);
  await sql.raw('select 1; lock table t').execute(kysely);
  await sql.raw("prepare transaction 'x'").execute(kysely);
  const preparada = sql.raw('refresh materialized view v');
  await preparada.execute(kysely);
}
