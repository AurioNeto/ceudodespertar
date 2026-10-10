import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function ajustar(db: Kysely<any>) {
  await sql`select SET_CONFIG('app.tenant', '1', true)`.execute(db);
  await sql`select Set_Config('app.tenant', '1', true)`.execute(db);
}
