import type { Kysely } from 'kysely';

export async function leitor(kysely: Kysely<any>) {
  await kysely.insertInto('t').values({ a: 1 }).execute();
}
