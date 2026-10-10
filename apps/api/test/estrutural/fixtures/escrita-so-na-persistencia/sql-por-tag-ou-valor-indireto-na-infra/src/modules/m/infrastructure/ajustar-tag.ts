import { sql } from 'kysely';
import * as k from 'kysely';
import type { Kysely } from 'kysely';

export async function ajustar(db: Kysely<any>) {
  const s = sql;
  await s`select set_config('app.tenant', '1', true)`.execute(db);
  await k.sql`commit`.execute(db);
}
