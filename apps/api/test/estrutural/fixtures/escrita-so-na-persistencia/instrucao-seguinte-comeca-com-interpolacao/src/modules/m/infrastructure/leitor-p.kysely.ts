import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>, verbo: string) {
  await sql`select 1; ${verbo}delete from t`.execute(kysely);
  await sql`select 1; /* c */ ${verbo}delete from t`.execute(kysely);
  const guardado = sql`select 1; ${verbo}delete from t`;
  await guardado.execute(kysely);
}
