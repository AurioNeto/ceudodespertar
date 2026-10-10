import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>, verbo: string) {
  await sql.raw('delete from t').execute(kysely);
  await sql`${verbo}update t set a = 1`.execute(kysely);
  await sql.raw('commit').execute(kysely);
  const guardado = sql.raw('truncate t');
  await guardado.execute(kysely);
}
