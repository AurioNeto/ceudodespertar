import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function ajustar(kysely: Kysely<any>) {
  await sql.raw("set local app.tenant = '1'").execute(kysely);
  await sql.raw('reset role').execute(kysely);
  await sql`reset all`.execute(kysely);
}
