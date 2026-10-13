import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { foraDaTransacaoAtiva } from '../banco/transacao-ativa.js';
import { listarIdsDasInstituicoes } from '../banco/instituicoes.js';
import { apagarLoteDeDespachados, TAMANHO_DO_LOTE_DO_EXPURGO } from './expurgo-do-outbox.repositorio.js';
import { MODO_DO_PROCESSO } from './modo-do-processo.js';
import type { ModoDoProcesso } from './modo-do-processo.js';

export const MENSAGEM_DE_DESPACHADOS_EXPURGADOS = 'outbox: eventos despachados expurgados';
export const MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES = 'outbox: falha ao listar instituições para o expurgo';
export const MENSAGEM_DE_FALHA_NO_EXPURGO = 'outbox: falha ao expurgar eventos despachados';
export const MENSAGEM_DE_EXPURGO_FALHANDO = 'outbox: expurgo falhando em rodadas seguidas';
export const MENSAGEM_DE_EXPURGO_RECUPERADO = 'outbox: expurgo voltou a funcionar';
export const INTERVALO_DO_EXPURGO_EM_MS = 3_600_000;
export const LOTES_POR_INSTITUICAO_POR_RODADA = 100;
export const RODADAS_COM_FALHA_ATE_O_ALERTA = 3;

interface ResultadoDaInstituicao {
  readonly apagados: number;
  readonly falhou: boolean;
}

function nomeDoErro(motivo: unknown): string {
  return motivo instanceof Error ? motivo.constructor.name : typeof motivo;
}

@Injectable()
export class ExpurgoDoOutbox implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExpurgoDoOutbox.name);
  private temporizador: NodeJS.Timeout | undefined;
  private rodadaEmAndamento: Promise<void> = Promise.resolve();
  private rodadasSeguidasComFalha = 0;

  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(MODO_DO_PROCESSO) private readonly modoDoProcesso: ModoDoProcesso,
  ) {}

  onModuleInit(): void {
    if (this.modoDoProcesso === 'cli') return;
    this.temporizador = setInterval(() => this.dispararExpurgo(), INTERVALO_DO_EXPURGO_EM_MS);
  }

  onApplicationBootstrap(): void {
    if (this.modoDoProcesso === 'cli') return;
    this.dispararExpurgo();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
    await this.rodadaEmAndamento;
  }

  async expurgar(): Promise<void> {
    this.registrarDesfecho(await this.rodadaSemFalha());
  }

  private async rodadaSemFalha(): Promise<boolean> {
    let instituicoes: string[];
    try {
      instituicoes = await this.unidadeDeTrabalho.transacao('leitura', ({ kysely }) =>
        listarIdsDasInstituicoes(kysely),
      );
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES);
      return false;
    }

    let apagados = 0;
    let instituicoesComApagados = 0;
    let algumaFalhou = false;
    for (const instituicaoId of instituicoes) {
      // eslint-disable-next-line no-await-in-loop -- uma instituição por vez, para não ocupar o pool
      const resultado = await this.expurgarInstituicao(instituicaoId);
      apagados += resultado.apagados;
      instituicoesComApagados += resultado.apagados > 0 ? 1 : 0;
      algumaFalhou ||= resultado.falhou;
    }

    if (apagados > 0) {
      this.logger.log({ apagados, instituicoes: instituicoesComApagados }, MENSAGEM_DE_DESPACHADOS_EXPURGADOS);
    }
    return !algumaFalhou;
  }

  private dispararExpurgo(): void {
    this.rodadaEmAndamento = this.rodadaEmAndamento.then(() =>
      ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.expurgar())).catch(
        (motivo: unknown) => {
          this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_NO_EXPURGO);
          this.registrarDesfecho(false);
        },
      ),
    );
  }

  private async expurgarInstituicao(instituicaoId: string): Promise<ResultadoDaInstituicao> {
    let apagados = 0;
    try {
      for (let lote = 0; lote < LOTES_POR_INSTITUICAO_POR_RODADA; lote += 1) {
        // eslint-disable-next-line no-await-in-loop -- um lote por transação, em sequência, para não segurar locks longos
        const apagadosNoLote = await this.apagarUmLote(instituicaoId);
        apagados += apagadosNoLote;
        if (apagadosNoLote < TAMANHO_DO_LOTE_DO_EXPURGO) break;
      }
      return { apagados, falhou: false };
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo), instituicaoId }, MENSAGEM_DE_FALHA_NO_EXPURGO);
      return { apagados, falhou: true };
    }
  }

  private apagarUmLote(instituicaoId: string): Promise<number> {
    return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, () =>
      this.unidadeDeTrabalho.transacao('escrita', ({ kysely }) => apagarLoteDeDespachados(kysely, instituicaoId)),
    );
  }

  private registrarDesfecho(semFalha: boolean): void {
    if (semFalha) {
      if (this.rodadasSeguidasComFalha >= RODADAS_COM_FALHA_ATE_O_ALERTA) {
        this.logger.log({ rodadasComFalha: this.rodadasSeguidasComFalha }, MENSAGEM_DE_EXPURGO_RECUPERADO);
      }
      this.rodadasSeguidasComFalha = 0;
      return;
    }
    this.rodadasSeguidasComFalha += 1;
    if (this.rodadasSeguidasComFalha === RODADAS_COM_FALHA_ATE_O_ALERTA) {
      this.logger.error({ rodadasComFalha: this.rodadasSeguidasComFalha }, MENSAGEM_DE_EXPURGO_FALHANDO);
    }
  }
}
