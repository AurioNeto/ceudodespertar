import { sql } from 'kysely';
import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

const CONSULTA_FIXA = 'select 1';
const PREFIXO = 'select ';
const LIMITE = 5;

export async function leitor(kysely: Kysely<any>, em: EntityManager) {
  await kysely
    .selectFrom('t')
    .select(sql<number>`count(*)::int`.as('total'))
    .where('a', '=', 1)
    .orderBy(sql`lower(nome)`)
    .execute();
  await em.execute('select 1');
  await em.execute(CONSULTA_FIXA);
  await em.execute(`${PREFIXO}2`);
  await em.execute(`select 1 limit ${LIMITE}`);
}
