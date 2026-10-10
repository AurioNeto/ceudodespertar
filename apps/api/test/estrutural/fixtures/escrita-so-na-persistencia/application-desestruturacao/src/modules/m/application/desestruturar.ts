import type { Kysely } from 'kysely';

export function desestruturar(kysely: Kysely<any>) {
  const { insertInto } = kysely;
  return insertInto;
}
