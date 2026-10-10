import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export async function indeterminado(em: EntityManager, kysely: Kysely<any>, texto: string) {
  await em.execute(texto);
  await sql`select ${sql.raw(texto)}`.execute(kysely);
}
