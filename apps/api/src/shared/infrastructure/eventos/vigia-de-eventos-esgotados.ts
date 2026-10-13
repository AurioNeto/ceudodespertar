import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';
import { foraDaTransacaoAtiva } from '../banco/transacao-ativa.js';
import { MODO_DO_PROCESSO } from './modo-do-processo.js';
import type { ModoDoProcesso } from './modo-do-processo.js';
import { TETO_DE_TENTATIVAS } from './teto-de-tentativas.js';

export const MENSAGEM_DE_EVENTOS_ESGOTADOS = 'outbox: eventos esgotados';
export const MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO = 'outbox: nenhum evento esgotado';
export const MENSAGEM_DE_FALHA_NA_VERIFICACAO = 'outbox: falha ao verificar eventos esgotados';
export const INTERVALO_DA_VIGIA_EM_MS = 60_000;
export const MAXIMO_DE_EVENTOS_NO_ALERTA = 20;

export const MARCACAO_DOS_NOVOS_ESGOTADOS = `
  update shared.outbox
     set alertado_em = now()
   where publicado_em is null
     and tentativas >= ${TETO_DE_TENTATIVAS}
     and alertado_em is null
  returning evento_id as "eventoId"
`;

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

interface Verificacao {
  readonly novos: readonly string[];
  readonly contagem: ContagemDosEsgotados;
}

function emIso(instante: Date | string | null): string | undefined {
  return instante === null ? undefined : new Date(instante).toISOString();
}

function nomeDoErro(motivo: unknown): string {
  return motivo instanceof Error ? motivo.constructor.name : typeof motivo;
}

async function marcarEContar(contexto: ContextoDaTransacao): Promise<Verificacao> {
  const novos = await contexto.em.execute<{ eventoId: string }[]>(MARCACAO_DOS_NOVOS_ESGOTADOS);
  const contagens = await contexto.em.execute<ContagemDosEsgotados[]>(CONSULTA_DOS_EVENTOS_ESGOTADOS);
  return {
    novos: novos.map(({ eventoId }) => eventoId).toSorted(),
    contagem: contagens[0] ?? { quantidade: 0, maisAntigoEm: null },
  };
}

@Injectable()
export class VigiaDeEventosEsgotados implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VigiaDeEventosEsgotados.name);
  private temporizador: NodeJS.Timeout | undefined;
  private rodadaEmAndamento: Promise<void> = Promise.resolve();
  private quantidadeConhecida = 0;

  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    @Inject(MODO_DO_PROCESSO) private readonly modoDoProcesso: ModoDoProcesso,
  ) {}

  onModuleInit(): void {
    if (this.modoDoProcesso === 'cli') return;
    this.temporizador = setInterval(() => this.agendarVerificacao(), INTERVALO_DA_VIGIA_EM_MS);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
    await this.rodadaEmAndamento;
  }

  async verificar(): Promise<void> {
    let verificacao: Verificacao;
    try {
      verificacao = await this.unidadeDeTrabalho.transacao('escrita', marcarEContar);
    } catch (motivo) {
      this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_NA_VERIFICACAO);
      return;
    }
    this.alertarNovos(verificacao);
    this.registrarZerada(verificacao.contagem.quantidade);
  }

  private agendarVerificacao(): void {
    const verificarForaDeContexto = () =>
      ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.verificar()));
    this.rodadaEmAndamento = this.rodadaEmAndamento
      .then(verificarForaDeContexto, verificarForaDeContexto)
      .catch((motivo: unknown) => this.logger.warn({ erro: nomeDoErro(motivo) }, MENSAGEM_DE_FALHA_NA_VERIFICACAO));
  }

  private alertarNovos({ novos, contagem }: Verificacao): void {
    if (novos.length === 0) {
      return;
    }
    this.logger.error(
      {
        novos: novos.length,
        eventos: novos.slice(0, MAXIMO_DE_EVENTOS_NO_ALERTA),
        quantidade: contagem.quantidade,
        maisAntigoEm: emIso(contagem.maisAntigoEm),
      },
      MENSAGEM_DE_EVENTOS_ESGOTADOS,
    );
  }

  private registrarZerada(quantidade: number): void {
    if (quantidade === 0 && this.quantidadeConhecida > 0) {
      this.logger.log({ quantidadeAnterior: this.quantidadeConhecida }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO);
    }
    this.quantidadeConhecida = quantidade;
  }
}
