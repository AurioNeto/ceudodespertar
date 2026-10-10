import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>) {
  await sql.raw("select '--'; delete from t").execute(kysely);
  await sql.raw("select '/*'; delete from t; select '*/'").execute(kysely);
  await sql.raw('select 1 -- nota\n; delete from t').execute(kysely);
  await sql`select '--'; ${sql.raw('')}delete from t`.execute(kysely);
}
