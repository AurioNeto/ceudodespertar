import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function ponto(kysely: Kysely<any>) {
  await sql.raw('savepoint p').execute(kysely);
  await sql.raw('release p').execute(kysely);
  await sql.raw('release savepoint p').execute(kysely);
  await sql.raw('rollback to p').execute(kysely);
  await sql.raw('ROLLBACK TO SAVEPOINT p').execute(kysely);
  await sql.raw('rollback work to savepoint p').execute(kysely);
  await sql.raw('rollback transaction to p').execute(kysely);
  await sql.raw('ROLLBACK TRANSACTION TO SAVEPOINT p').execute(kysely);
}
