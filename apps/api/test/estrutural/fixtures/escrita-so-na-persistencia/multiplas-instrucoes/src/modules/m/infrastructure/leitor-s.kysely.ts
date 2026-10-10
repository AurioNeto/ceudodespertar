import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>) {
  await sql`select 1; delete from t`.execute(kysely);
  await sql.raw("select 'a; delete from t'; select 2").execute(kysely);
}
