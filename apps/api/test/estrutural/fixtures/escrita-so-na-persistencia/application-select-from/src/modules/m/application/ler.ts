import type { Kysely } from 'kysely';

export async function ler(kysely: Kysely<any>) {
  return kysely.selectFrom('t').selectAll().execute();
}
