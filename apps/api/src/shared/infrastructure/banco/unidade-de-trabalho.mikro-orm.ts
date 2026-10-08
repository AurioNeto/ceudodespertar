import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, Logger } from '@nestjs/common';
import { IsolationLevel, MikroORM } from '@mikro-orm/postgresql';
import type { EntityManager, TransactionOptions } from '@mikro-orm/postgresql';
import { ehResultadoDeErro } from '../../kernel/result.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from './unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from './unidade-de-trabalho.js';
import type { DB } from './banco-cdd.gerado.js';

export const VARIAVEL_DE_SESSAO_DA_INSTITUICAO = 'app.instituicao_id';

export const OPCOES_DE_TRANSACAO_POR_MODO: Record<ModoDeTransacao, TransactionOptions> = {
  escrita: { isolationLevel: IsolationLevel.READ_COMMITTED, readOnly: false },
  leitura: { isolationLevel: IsolationLevel.REPEATABLE_READ, readOnly: true },
  'leitura-que-grava': {
    isolationLevel: IsolationLevel.READ_COMMITTED,
    readOnly: false,
  },
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

class DesfazerPorResultadoDeErro<T> extends Error {
  constructor(readonly resultado: T) {
    super('transação desfeita por Result de erro');
    this.name = 'DesfazerPorResultadoDeErro';
  }
}

const transacaoAtiva = new AsyncLocalStorage<TransacaoAtiva>();

export function foraDaTransacaoAtiva<T>(fn: () => T): T {
  return transacaoAtiva.exit(fn);
}

@Injectable()
export class UnidadeDeTrabalhoMikroOrm extends UnidadeDeTrabalho {
  private readonly logger = new Logger(UnidadeDeTrabalhoMikroOrm.name);

  constructor(private readonly orm: MikroORM) {
    super();
  }

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    const ativa = transacaoAtiva.getStore();
    if (ativa !== undefined) {
      if (ehGravavel(modo) && !ehGravavel(ativa.modo)) {
        throw new ErroDeModoDeTransacaoIncompativel(ativa.modo, modo);
      }
      return fn(ativa.contexto);
    }

    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    const em = this.orm.em.fork();
    const ganchosDeConfirmacao: Array<() => void> = [];

    try {
      return await this.executarNaTransacao(em, modo, instituicaoId, ganchosDeConfirmacao, fn);
    } catch (motivo) {
      if (motivo instanceof DesfazerPorResultadoDeErro) {
        return motivo.resultado as T;
      }
      throw motivo;
    }
  }

  private async executarNaTransacao<T>(
    em: EntityManager,
    modo: ModoDeTransacao,
    instituicaoId: string | undefined,
    ganchosDeConfirmacao: Array<() => void>,
    fn: (contexto: ContextoDaTransacao) => Promise<T>,
  ): Promise<T> {
    const resultado = await em.transactional(async (emDaTransacao) => {
      if (ehGravavel(modo)) {
        await emDaTransacao.execute('set transaction read write');
      }
      if (instituicaoId !== undefined) {
        await emDaTransacao.execute('select set_config(?, ?, true)', [
          VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
          instituicaoId,
        ]);
      }
      const contexto: ContextoDaTransacao = {
        em: emDaTransacao,
        kysely: emDaTransacao.getKysely<DB>(),
        aoConfirmar: (gancho) => ganchosDeConfirmacao.push(gancho),
      };
      const valor = await transacaoAtiva.run({ modo, contexto }, () => fn(contexto));
      if (ehResultadoDeErro(valor)) {
        throw new DesfazerPorResultadoDeErro(valor);
      }
      return valor;
    }, OPCOES_DE_TRANSACAO_POR_MODO[modo]);

    this.executarGanchosDeConfirmacao(ganchosDeConfirmacao);

    return resultado;
  }

  private executarGanchosDeConfirmacao(ganchos: ReadonlyArray<() => void>): void {
    for (const gancho of ganchos) {
      try {
        gancho();
      } catch (motivo) {
        const erro = motivo instanceof Error ? motivo : new Error(String(motivo));
        this.logger.error(`gancho de confirmação falhou depois do commit: ${erro.name}`, erro.stack);
      }
    }
  }
}
