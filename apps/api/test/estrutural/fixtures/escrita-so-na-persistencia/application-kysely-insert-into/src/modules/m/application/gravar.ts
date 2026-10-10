import type { Kysely } from 'kysely';

export interface Contexto {
  readonly kysely: Kysely<any>;
}

export async function gravar(contexto: Contexto): Promise<void> {
  await contexto.kysely.insertInto('t').values({ a: 1 }).execute();
}
