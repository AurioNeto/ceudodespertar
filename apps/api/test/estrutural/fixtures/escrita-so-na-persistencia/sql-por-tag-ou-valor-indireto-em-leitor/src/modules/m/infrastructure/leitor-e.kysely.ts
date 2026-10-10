import { sql } from 'kysely';
import * as k from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export async function leitor(db: Kysely<any>, em: EntityManager) {
  await k.sql`delete from t`.execute(db);
  await (sql)`delete from t`.execute(db);
  const s = sql;
  await s`commit`.execute(db);
  const r = sql.raw;
  await r('delete from t').execute(db);
  await Reflect.apply(em.execute, em, ['delete from t']);
}
