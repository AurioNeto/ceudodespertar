import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export async function ajustar(em: EntityManager, kysely: Kysely<any>, valor: string) {
  await em.execute("select set_config('a', 'b', true)");
  await em.execute('set local x to 1');
  await sql`select set_config(${valor}, 'y', true)`.execute(kysely);
}
