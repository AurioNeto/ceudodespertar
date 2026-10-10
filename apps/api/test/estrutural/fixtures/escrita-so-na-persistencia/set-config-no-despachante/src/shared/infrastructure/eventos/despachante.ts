import type { EntityManager } from '@mikro-orm/postgresql';

export async function despachar(em: EntityManager) {
  await em.execute("select set_config('a', 'b', true)");
  await em.execute('set local statement_timeout to default');
}
