import { sql as consulta } from 'kysely';
import type { Kysely } from 'kysely';

export function inserir(kysely: Kysely<any>) {
  const alias = kysely;
  return alias.insertInto('t');
}

export const consultaCrua = consulta`select 1`;
