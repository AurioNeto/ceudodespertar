import { Injectable, Logger } from '@nestjs/common';
import { IsolationLevel, MikroORM } from '@mikro-orm/postgresql';
import type { EntityManager, TransactionOptions } from '@mikro-orm/postgresql';
import { ehResultadoDeErro } from '../../kernel/result.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from './unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from './unidade-de-trabalho.js';
import type { DB } from './banco-cdd.gerado.js';
import { transacaoAtiva } from './transacao-ativa.js';
import type { EstadoDaTransacao, TransacaoAtiva } from './transacao-ativa.js';

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

export class ErroDeTransacaoEncerrada extends Error {
  constructor() {
    super(
      'transação pedida dentro de uma transação que já terminou — um callback solto (timer, promessa sem await) ' +
        'herdou o contexto dela; agende-o com foraDaTransacaoAtiva ou use aoConfirmar',
    );
    this.name = 'ErroDeTransacaoEncerrada';
  }
}

export class ErroDeInstituicaoDivergenteNaTransacao extends Error {
  constructor() {
    super(
      'transação pedida com uma instituição no contexto diferente da instituição vinculada à transação aberta — ' +
        'o reuso misturaria as instituições; rode o trabalho fora da transação ativa',
    );
    this.name = 'ErroDeInstituicaoDivergenteNaTransacao';
  }
}

function conferirReuso(ativa: TransacaoAtiva, modo: ModoDeTransacao): void {
  if (!ativa.estado.aberta) {
    throw new ErroDeTransacaoEncerrada();
  }
  if (ContextoDaRequisicao.atual()?.instituicaoId !== ativa.estado.instituicaoId) {
    throw new ErroDeInstituicaoDivergenteNaTransacao();
  }
  if (ehGravavel(modo) && !ehGravavel(ativa.modo)) {
    throw new ErroDeModoDeTransacaoIncompativel(ativa.modo, modo);
  }
}

class DesfazerPorResultadoDeErro<T> extends Error {
  constructor(readonly resultado: T) {
    super('transação desfeita por Result de erro');
    this.name = 'DesfazerPorResultadoDeErro';
  }
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
      conferirReuso(ativa, modo);
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
      const estado: EstadoDaTransacao = { aberta: true, instituicaoId: undefined };
      const contexto: ContextoDaTransacao = {
        em: emDaTransacao,
        kysely: emDaTransacao.getKysely<DB>(),
        aoConfirmar: (gancho) => ganchosDeConfirmacao.push(gancho),
        vincularInstituicao: async (instituicao) => {
          await emDaTransacao.execute('select set_config(?, ?, true)', [VARIAVEL_DE_SESSAO_DA_INSTITUICAO, instituicao]);
          estado.instituicaoId = instituicao;
        },
      };
      if (instituicaoId !== undefined) {
        await contexto.vincularInstituicao(instituicaoId);
      }
      let valor: T;
      try {
        valor = await transacaoAtiva.run({ modo, contexto, estado }, () => fn(contexto));
      } finally {
        estado.aberta = false;
      }
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
