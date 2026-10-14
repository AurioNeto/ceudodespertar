import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { DB } from './banco-cdd.gerado.js';
import { listarIdsDasInstituicoes } from './instituicoes.js';
import { foraDaTransacaoAtiva } from './transacao-ativa.js';
import type { UnidadeDeTrabalho } from './unidade-de-trabalho.js';

export const LOTES_POR_INSTITUICAO_POR_RODADA = 100;
export const RODADAS_COM_FALHA_ATE_O_ALERTA = 3;

export interface MensagensDoExpurgo {
  readonly apagados: string;
  readonly falhaAoListarInstituicoes: string;
  readonly falhaNoExpurgo: string;
  readonly falhando: string;
  readonly recuperado: string;
}

export interface DefinicaoDoExpurgo {
  readonly mensagens: MensagensDoExpurgo;
  readonly intervaloEmMs: number;
  readonly tamanhoDoLote: number;
  readonly apagarLote: (kysely: Kysely<DB>, instituicaoId: string) => Promise<number>;
}

interface ResultadoDaInstituicao {
  readonly apagados: number;
  readonly falhou: boolean;
}

function nomeDoErro(motivo: unknown): string {
  return motivo instanceof Error ? motivo.constructor.name : typeof motivo;
}

export abstract class ExpurgoEmLotesPorInstituicao implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);
  private temporizador: NodeJS.Timeout | undefined;
  private rodadaEmAndamento: Promise<void> = Promise.resolve();
  private rodadasSeguidasComFalha = 0;

  protected constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly definicao: DefinicaoDoExpurgo,
    private readonly agendado: boolean,
  ) {}

  onModuleInit(): void {
    if (!this.agendado) return;
    this.temporizador = setInterval(() => this.dispararExpurgo(), this.definicao.intervaloEmMs);
  }

  onApplicationBootstrap(): void {
    if (!this.agendado) return;
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

  private get mensagens(): MensagensDoExpurgo {
    return this.definicao.mensagens;
  }

  private async rodadaSemFalha(): Promise<boolean> {
    let instituicoes: string[];
    try {
      instituicoes = await this.unidadeDeTrabalho.transacao('leitura', ({ kysely }) =>
        listarIdsDasInstituicoes(kysely),
      );
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo) }, this.mensagens.falhaAoListarInstituicoes);
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
      this.logger.log({ apagados, instituicoes: instituicoesComApagados }, this.mensagens.apagados);
    }
    return !algumaFalhou;
  }

  private dispararExpurgo(): void {
    this.rodadaEmAndamento = this.rodadaEmAndamento.then(() =>
      ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.expurgar())).catch(
        (motivo: unknown) => {
          this.logger.warn({ erro: nomeDoErro(motivo) }, this.mensagens.falhaNoExpurgo);
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
        if (apagadosNoLote < this.definicao.tamanhoDoLote) break;
      }
      return { apagados, falhou: false };
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo), instituicaoId }, this.mensagens.falhaNoExpurgo);
      return { apagados, falhou: true };
    }
  }

  private apagarUmLote(instituicaoId: string): Promise<number> {
    return ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, () =>
      this.unidadeDeTrabalho.transacao('escrita', ({ kysely }) => this.definicao.apagarLote(kysely, instituicaoId)),
    );
  }

  private registrarDesfecho(semFalha: boolean): void {
    if (semFalha) {
      if (this.rodadasSeguidasComFalha >= RODADAS_COM_FALHA_ATE_O_ALERTA) {
        this.logger.log({ rodadasComFalha: this.rodadasSeguidasComFalha }, this.mensagens.recuperado);
      }
      this.rodadasSeguidasComFalha = 0;
      return;
    }
    this.rodadasSeguidasComFalha += 1;
    if (this.rodadasSeguidasComFalha === RODADAS_COM_FALHA_ATE_O_ALERTA) {
      this.logger.error({ rodadasComFalha: this.rodadasSeguidasComFalha }, this.mensagens.falhando);
    }
  }
}
