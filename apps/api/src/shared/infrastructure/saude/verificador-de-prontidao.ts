import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { Pool } from 'pg';
import {
  POOL_DA_PRONTIDAO,
  TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS,
} from '../banco/pool-da-prontidao.js';
export const ATRASO_MAXIMO_DO_OUTBOX_EM_SEGUNDOS = 5 * 60;
export const TENTATIVAS_QUE_ESGOTAM_O_EVENTO = 10;

export type MotivoDeIndisponibilidade = 'banco-inacessivel' | 'outbox-atrasado';

export type ResultadoDaProntidao =
  | { readonly pronta: true }
  | { readonly pronta: false; readonly motivo: MotivoDeIndisponibilidade };

interface AvaliacaoDaProntidao {
  readonly resultado: ResultadoDaProntidao;
  readonly erro?: unknown;
}

interface LinhaDoOutbox {
  readonly outbox_atrasado: boolean;
}

const CONSULTA_DO_OUTBOX_ATRASADO = `
  select exists (
           select 1
             from shared.outbox
            where publicado_em is null
              and tentativas < ${TENTATIVAS_QUE_ESGOTAM_O_EVENTO}
              and ocorrido_em < now() - interval '${ATRASO_MAXIMO_DO_OUTBOX_EM_SEGUNDOS} seconds'
         )
      or exists (
           select 1
             from shared.outbox
            where publicado_em is null
              and tentativas >= ${TENTATIVAS_QUE_ESGOTAM_O_EVENTO}
         ) as outbox_atrasado
`;

class ErroDeTempoEsgotado extends Error {
  constructor(milissegundos: number) {
    super(`consulta de prontidão excedeu ${milissegundos} ms`);
    this.name = 'ErroDeTempoEsgotado';
  }
}

function comTempoLimite<T>(promessa: Promise<T>, milissegundos: number): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  const tempoEsgotado = new Promise<never>((_resolver, rejeitar) => {
    temporizador = setTimeout(
      () => rejeitar(new ErroDeTempoEsgotado(TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS)),
      Math.max(milissegundos, 0),
    );
  });
  return Promise.race([promessa, tempoEsgotado]).finally(() => clearTimeout(temporizador));
}

@Injectable()
export class VerificadorDeProntidao {
  private ultimoMotivoRegistrado: MotivoDeIndisponibilidade | undefined;

  constructor(
    @Inject(POOL_DA_PRONTIDAO) private readonly pool: Pool,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(VerificadorDeProntidao.name);
    this.pool.on('error', (erro) => this.logger.warn({ err: erro }, 'prontidão: a conexão ociosa da sonda caiu'));
  }

  async verificar(): Promise<ResultadoDaProntidao> {
    const { resultado, erro } = await this.avaliar();
    this.registrarMudancaDeEstado(resultado, erro);
    return resultado;
  }

  private async avaliar(): Promise<AvaliacaoDaProntidao> {
    let outboxAtrasado: boolean;
    try {
      outboxAtrasado = await this.consultarOutboxAtrasado();
    } catch (erro) {
      return { resultado: { pronta: false, motivo: 'banco-inacessivel' }, erro };
    }
    return { resultado: outboxAtrasado ? { pronta: false, motivo: 'outbox-atrasado' } : { pronta: true } };
  }

  private async consultarOutboxAtrasado(): Promise<boolean> {
    const inicio = performance.now();
    const cliente = await this.pool.connect();
    const tempoRestante = TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS - (performance.now() - inicio);
    let conexaoComprometida = false;
    try {
      const { rows } = await comTempoLimite(cliente.query<LinhaDoOutbox>(CONSULTA_DO_OUTBOX_ATRASADO), tempoRestante);
      return rows[0]?.outbox_atrasado === true;
    } catch (erro) {
      conexaoComprometida = true;
      throw erro;
    } finally {
      cliente.release(conexaoComprometida);
    }
  }

  private registrarMudancaDeEstado(resultado: ResultadoDaProntidao, erro: unknown): void {
    const motivoAtual = resultado.pronta ? undefined : resultado.motivo;
    if (motivoAtual === this.ultimoMotivoRegistrado) {
      return;
    }
    if (motivoAtual === undefined) {
      this.logger.info({ motivoAnterior: this.ultimoMotivoRegistrado }, 'prontidão: pronta de novo');
    } else {
      this.logger.error({ motivo: motivoAtual, err: erro }, 'prontidão: indisponível');
    }
    this.ultimoMotivoRegistrado = motivoAtual;
  }
}
