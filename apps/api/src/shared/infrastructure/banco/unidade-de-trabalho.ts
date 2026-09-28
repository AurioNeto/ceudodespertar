import type { EntityManager, Kysely } from '@mikro-orm/postgresql';

export type ModoDeTransacao = 'escrita' | 'leitura' | 'leitura-que-grava';

export interface ContextoDaTransacao {
  readonly em: EntityManager;
  readonly kysely: Kysely<unknown>;
}

export abstract class UnidadeDeTrabalho {
  abstract transacao<T>(
    modo: ModoDeTransacao,
    fn: (contexto: ContextoDaTransacao) => Promise<T>,
  ): Promise<T>;
}
