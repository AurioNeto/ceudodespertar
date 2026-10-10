import type { Kysely } from 'kysely';

export async function transacionar(kysely: Kysely<any>) {
  await kysely.transaction().execute(async () => {});
  await kysely.startTransaction().execute();
}
