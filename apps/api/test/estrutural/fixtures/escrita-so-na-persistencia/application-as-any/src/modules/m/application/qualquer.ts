import type { Kysely } from 'kysely';

export function qualquer(kysely: Kysely<any>) {
  return kysely as any;
}
