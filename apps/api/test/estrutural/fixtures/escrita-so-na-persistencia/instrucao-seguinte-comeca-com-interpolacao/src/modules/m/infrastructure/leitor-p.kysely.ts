import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>) {
  await sql`select 1; ${sql.raw('')}delete from t`.execute(kysely);
  await sql`select 1; /* c */ ${sql.raw('')}delete from t`.execute(kysely);
  const guardado = sql`select 1; ${sql.raw('')}delete from t`;
  await guardado.execute(kysely);
}
