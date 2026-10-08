import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { foraDaTransacaoAtiva } from '../banco/unidade-de-trabalho.mikro-orm.js';
import { apagarChavesVencidas, listarIdsDasInstituicoes } from './chave-de-idempotencia.repositorio.js';

export const MENSAGEM_DE_CHAVES_EXPURGADAS = 'idempotência: chaves vencidas expurgadas';
export const MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES = 'idempotência: falha ao listar instituições para o expurgo';
export const MENSAGEM_DE_FALHA_NO_EXPURGO = 'idempotência: falha ao expurgar chaves vencidas';
export const INTERVALO_DO_EXPURGO_EM_MS = 3_600_000;

function nomeDoErro(motivo: unknown): string {
  return motivo instanceof Error ? motivo.constructor.name : typeof motivo;
}

@Injectable()
export class ExpurgoDeChavesDeIdempotencia implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ExpurgoDeChavesDeIdempotencia.name);
  private temporizador: NodeJS.Timeout | undefined;

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  onModuleInit(): void {
    this.temporizador = setInterval(() => this.dispararExpurgo(), INTERVALO_DO_EXPURGO_EM_MS);
  }

  onApplicationBootstrap(): void {
    this.dispararExpurgo();
  }

  onModuleDestroy(): void {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
  }

  async expurgar(): Promise<void> {
    let instituicoes: string[];
    try {
      instituicoes = await this.unidadeDeTrabalho.transacao('leitura', ({ kysely }) =>
        listarIdsDasInstituicoes(kysely),
      );
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_AO_LISTAR_INSTITUICOES);
      return;
    }

    let apagadas = 0;
    let instituicoesComApagadas = 0;
    for (const instituicaoId of instituicoes) {
      // eslint-disable-next-line no-await-in-loop -- uma transação por instituição, em sequência, para não ocupar o pool
      const apagadasDaInstituicao = await this.expurgarInstituicao(instituicaoId);
      apagadas += apagadasDaInstituicao;
      instituicoesComApagadas += apagadasDaInstituicao > 0 ? 1 : 0;
    }

    if (apagadas > 0) {
      this.logger.log({ apagadas, instituicoes: instituicoesComApagadas }, MENSAGEM_DE_CHAVES_EXPURGADAS);
    }
  }

  private dispararExpurgo(): void {
    ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.expurgar())).catch(
      (motivo: unknown) => this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_NO_EXPURGO),
    );
  }

  private async expurgarInstituicao(instituicaoId: string): Promise<number> {
    try {
      return await ContextoDaRequisicao.executar({ correlacaoId: randomUUID(), instituicaoId }, () =>
        this.unidadeDeTrabalho.transacao('escrita', ({ kysely }) => apagarChavesVencidas(kysely, instituicaoId)),
      );
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo), instituicaoId }, MENSAGEM_DE_FALHA_NO_EXPURGO);
      return 0;
    }
  }
}
