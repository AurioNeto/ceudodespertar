import type { EntityManager } from '@mikro-orm/postgresql';

export async function executar(em: EntityManager, variavel: string) {
  await em.execute(`select 1; ${variavel}`);
  await em.execute('select 1; ' + variavel);
}
