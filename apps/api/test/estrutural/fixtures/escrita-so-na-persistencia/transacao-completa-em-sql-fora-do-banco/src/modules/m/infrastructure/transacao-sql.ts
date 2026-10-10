import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function transacionar(kysely: Kysely<any>) {
  await sql.raw('begin').execute(kysely);
  await sql.raw('start transaction').execute(kysely);
  await sql.raw('commit').execute(kysely);
  await sql.raw('end').execute(kysely);
  await sql.raw('abort').execute(kysely);
  await sql.raw('rollback').execute(kysely);
  await sql.raw('rollback work').execute(kysely);
  await sql`savepoint a; commit`.execute(kysely);
}
