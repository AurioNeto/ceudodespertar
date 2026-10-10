import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

interface Repositorio {
  buscar(): void;
}

export function disfarcar(kysely: Kysely<any>, em: EntityManager) {
  const doKysely = kysely as unknown as Repositorio;
  const doOrm = <Repositorio>(<unknown>em);
  return [doKysely, doOrm];
}

export function disfarcarUniao(banco: Kysely<any> | EntityManager) {
  return banco as unknown as Repositorio;
}
