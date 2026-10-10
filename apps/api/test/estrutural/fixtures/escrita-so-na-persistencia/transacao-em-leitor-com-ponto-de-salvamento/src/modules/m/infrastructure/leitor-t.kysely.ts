import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>) {
  await sql.raw('savepoint p').execute(kysely);
  await sql.raw('release savepoint p').execute(kysely);
  await sql.raw('rollback to p').execute(kysely);
  await sql.raw('commit').execute(kysely);
  await sql.raw('rollback').execute(kysely);
}
