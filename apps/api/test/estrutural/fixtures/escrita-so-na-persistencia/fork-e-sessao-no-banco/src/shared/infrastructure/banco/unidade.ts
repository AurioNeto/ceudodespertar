import type { EntityManager } from '@mikro-orm/postgresql';

export async function unidade(em: EntityManager) {
  const filho = em.fork();
  await filho.transactional(async (dentro) => {
    await dentro.execute('set transaction read write');
    await dentro.execute("select set_config('a', 'b', true)");
  });
}
