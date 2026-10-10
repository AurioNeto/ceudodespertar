import { sql } from 'kysely';
import type { Kysely } from 'kysely';

export function leitor(kysely: Kysely<any>) {
  const sozinho = sql`${sql.raw('a')} desc`;
  const rotulado = sql`${sql.raw('a')} from t`.as('x');
  const compilado = sql`${sql.raw('a')} from t`.compile(kysely);
  return [sozinho, rotulado, compilado];
}
