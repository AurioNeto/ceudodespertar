import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { foraDaTransacaoAtiva } from '../banco/unidade-de-trabalho.mikro-orm.js';
import { TETO_DE_TENTATIVAS } from './teto-de-tentativas.js';

export const MENSAGEM_DE_EVENTOS_ESGOTADOS = 'outbox: eventos esgotados';
export const MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO = 'outbox: nenhum evento esgotado';
export const MENSAGEM_DE_FALHA_NA_CONTAGEM = 'outbox: falha ao contar eventos esgotados';
export const INTERVALO_DA_VIGIA_EM_MS = 60_000;

export const CONSULTA_DOS_EVENTOS_ESGOTADOS = `
  select count(*)::int as quantidade, min(ocorrido_em) as "maisAntigoEm"
    from shared.outbox
   where publicado_em is null
     and tentativas >= ${TETO_DE_TENTATIVAS}
`;

interface ContagemDosEsgotados {
  readonly quantidade: number;
  readonly maisAntigoEm: Date | string | null;
}

function emIso(instante: Date | string | null): string | undefined {
  return instante === null ? undefined : new Date(instante).toISOString();
}

function nomeDoErro(motivo: unknown): string {
  return motivo instanceof Error ? motivo.constructor.name : typeof motivo;
}

@Injectable()
export class VigiaDeEventosEsgotados implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VigiaDeEventosEsgotados.name);
  private temporizador: NodeJS.Timeout | undefined;
  private quantidadeConhecida = 0;

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  onModuleInit(): void {
    this.temporizador = setInterval(() => this.agendarVerificacao(), INTERVALO_DA_VIGIA_EM_MS);
  }

  onModuleDestroy(): void {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
  }

  async verificar(): Promise<void> {
    let contagem: ContagemDosEsgotados;
    try {
      contagem = await this.contarEsgotados();
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_NA_CONTAGEM);
      return;
    }
    this.registrarMudanca(contagem);
  }

  private agendarVerificacao(): void {
    void ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.verificar()));
  }

  private async contarEsgotados(): Promise<ContagemDosEsgotados> {
    const linhas = await this.unidadeDeTrabalho.transacao('leitura', (contexto) =>
      contexto.em.execute<ContagemDosEsgotados[]>(CONSULTA_DOS_EVENTOS_ESGOTADOS),
    );
    return linhas[0] ?? { quantidade: 0, maisAntigoEm: null };
  }

  private registrarMudanca({ quantidade, maisAntigoEm }: ContagemDosEsgotados): void {
    if (quantidade === this.quantidadeConhecida) {
      return;
    }
    if (quantidade === 0) {
      this.logger.log({ quantidadeAnterior: this.quantidadeConhecida }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO);
    } else {
      this.logger.error({ quantidade, maisAntigoEm: emIso(maisAntigoEm) }, MENSAGEM_DE_EVENTOS_ESGOTADOS);
    }
    this.quantidadeConhecida = quantidade;
  }
}
