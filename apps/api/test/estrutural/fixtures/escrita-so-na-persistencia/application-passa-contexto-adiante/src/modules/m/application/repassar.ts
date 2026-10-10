import type { Kysely } from 'kysely';
import type { EntityManager } from '@mikro-orm/postgresql';

export interface Contexto {
  readonly kysely: Kysely<any>;
  readonly em: EntityManager;
}

export abstract class Porta {
  abstract gravar(contexto: Contexto): Promise<void>;
}

export async function repassar(contexto: Contexto, porta: Porta) {
  await porta.gravar(contexto);
}
