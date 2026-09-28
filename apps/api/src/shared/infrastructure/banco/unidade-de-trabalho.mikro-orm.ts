import { Injectable } from '@nestjs/common';
import { IsolationLevel, MikroORM } from '@mikro-orm/postgresql';
import type { TransactionOptions } from '@mikro-orm/postgresql';
import { ContextoDaRequisicao } from '../../kernel/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from './unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from './unidade-de-trabalho.js';

export const VARIAVEL_DE_SESSAO_DA_INSTITUICAO = 'app.instituicao_id';

export const OPCOES_DE_TRANSACAO_POR_MODO: Record<ModoDeTransacao, TransactionOptions> = {
  escrita: { isolationLevel: IsolationLevel.READ_COMMITTED, readOnly: false },
  leitura: { isolationLevel: IsolationLevel.REPEATABLE_READ, readOnly: true },
  'leitura-que-grava': { isolationLevel: IsolationLevel.READ_COMMITTED, readOnly: false },
};

@Injectable()
export class UnidadeDeTrabalhoMikroOrm extends UnidadeDeTrabalho {
  constructor(private readonly orm: MikroORM) {
    super();
  }

  async transacao<T>(
    modo: ModoDeTransacao,
    fn: (contexto: ContextoDaTransacao) => Promise<T>,
  ): Promise<T> {
    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    const em = this.orm.em.fork();

    return em.transactional(async (emDaTransacao) => {
      if (instituicaoId !== undefined) {
        await emDaTransacao.execute('select set_config(?, ?, true)', [
          VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
          instituicaoId,
        ]);
      }
      return fn({ em: emDaTransacao, kysely: emDaTransacao.getKysely() });
    }, OPCOES_DE_TRANSACAO_POR_MODO[modo]);
  }
}
