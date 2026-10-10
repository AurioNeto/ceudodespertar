import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function ponto(kysely: Kysely<any>) {
  await sql`savepoint ${sql.raw('p')}`.execute(kysely);
  await sql`rollback to savepoint ${sql.raw('p')}`.execute(kysely);
}
