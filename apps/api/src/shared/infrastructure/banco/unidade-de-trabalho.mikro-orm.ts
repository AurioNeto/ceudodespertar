import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { IsolationLevel, MikroORM } from '@mikro-orm/postgresql';
import type { TransactionOptions } from '@mikro-orm/postgresql';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from './unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from './unidade-de-trabalho.js';

export const VARIAVEL_DE_SESSAO_DA_INSTITUICAO = 'app.instituicao_id';

export const OPCOES_DE_TRANSACAO_POR_MODO: Record<ModoDeTransacao, TransactionOptions> = {
  escrita: { isolationLevel: IsolationLevel.READ_COMMITTED, readOnly: false },
  leitura: { isolationLevel: IsolationLevel.REPEATABLE_READ, readOnly: true },
  'leitura-que-grava': { isolationLevel: IsolationLevel.READ_COMMITTED, readOnly: false },
};

function ehGravavel(modo: ModoDeTransacao): boolean {
  return modo !== 'leitura';
}

export class ErroDeModoDeTransacaoIncompativel extends Error {
  constructor(modoAtivo: ModoDeTransacao, modoPedido: ModoDeTransacao) {
    super(
      `transação de modo "${modoPedido}" pedida dentro de uma transação "${modoAtivo}" já aberta — ` +
        'uma transação de leitura não pode ser promovida a escrita depois de aberta',
    );
    this.name = 'ErroDeModoDeTransacaoIncompativel';
  }
}

interface TransacaoAtiva {
  readonly modo: ModoDeTransacao;
  readonly contexto: ContextoDaTransacao;
}

const transacaoAtiva = new AsyncLocalStorage<TransacaoAtiva>();

@Injectable()
export class UnidadeDeTrabalhoMikroOrm extends UnidadeDeTrabalho {
  constructor(private readonly orm: MikroORM) {
    super();
  }

  async transacao<T>(
    modo: ModoDeTransacao,
    fn: (contexto: ContextoDaTransacao) => Promise<T>,
  ): Promise<T> {
    const ativa = transacaoAtiva.getStore();
    if (ativa !== undefined) {
      if (ehGravavel(modo) && !ehGravavel(ativa.modo)) {
        throw new ErroDeModoDeTransacaoIncompativel(ativa.modo, modo);
      }
      return fn(ativa.contexto);
    }

    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    const em = this.orm.em.fork();

    return em.transactional(async (emDaTransacao) => {
      if (ehGravavel(modo)) {
        await emDaTransacao.execute('set transaction read write');
      }
      if (instituicaoId !== undefined) {
        await emDaTransacao.execute('select set_config(?, ?, true)', [
          VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
          instituicaoId,
        ]);
      }
      const contexto: ContextoDaTransacao = { em: emDaTransacao, kysely: emDaTransacao.getKysely() };
      return transacaoAtiva.run({ modo, contexto }, () => fn(contexto));
    }, OPCOES_DE_TRANSACAO_POR_MODO[modo]);
  }
}
