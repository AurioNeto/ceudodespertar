import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';
import {
  VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
  foraDaTransacaoAtiva,
} from '../banco/unidade-de-trabalho.mikro-orm.js';
import { calcularProximaTentativa } from './backoff.js';
import { formatarUltimoErro } from './formatador-de-erro.js';
import type { ConsumidorRegistrado } from './registro-de-consumidores.js';
import { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';
import { TETO_DE_TENTATIVAS } from './teto-de-tentativas.js';

export const TIMEOUT_DO_CONSUMIDOR_EM_MS = Symbol('TIMEOUT_DO_CONSUMIDOR_EM_MS');
export const TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS = 30_000;
const TAMANHO_MAXIMO_DO_CICLO = 100;
const INTERVALO_DE_POLLING_EM_MS = 1000;
const FOLGA_DO_TIMEOUT_DA_APLICACAO_EM_MS = 250;
const SAVEPOINT_DO_CONSUMIDOR = 'evento_consumidor';
const ENCERRAR_TRANSACAO_E_BLOQUEAR_ESCRITA_AVULSA = 'rollback; set default_transaction_read_only = on';

export const CONSULTA_DO_PROXIMO_EVENTO = `
  select o.id, o.evento_id as "eventoId", o.instituicao_id as "instituicaoId", o.tipo,
         o.agregado_tipo as "agregadoTipo", o.agregado_id as "agregadoId", o.payload,
         o.ocorrido_em as "ocorridoEm", o.tentativas
  from shared.outbox o
  where o.publicado_em is null
    and o.tentativas < ${TETO_DE_TENTATIVAS}
    and coalesce(o.proxima_tentativa_em, '-infinity') <= now()
    and not exists (
      select 1
      from shared.outbox anterior
      where anterior.agregado_tipo = o.agregado_tipo
        and anterior.agregado_id = o.agregado_id
        and anterior.id < o.id
        and anterior.publicado_em is null
    )
  order by o.id
  limit 1
  for update skip locked
`;

interface LinhaDoOutbox {
  readonly id: number;
  readonly eventoId: string;
  readonly instituicaoId: string;
  readonly tipo: string;
  readonly agregadoTipo: string;
  readonly agregadoId: string;
  readonly payload: Record<string, unknown>;
  readonly ocorridoEm: Date;
  readonly tentativas: number;
}

export function lerTimeoutDoConsumidorEmMs(ambiente: NodeJS.ProcessEnv = process.env): number {
  const bruto = ambiente.TIMEOUT_DO_CONSUMIDOR_EM_MS;
  const valor = bruto !== undefined ? Number(bruto) : Number.NaN;
  return Number.isFinite(valor) && valor > 0 ? valor : TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS;
}

export class ErroDeTimeoutDoConsumidor extends Error {
  constructor(consumidor: string, timeoutEmMs: number) {
    super(`consumidor "${consumidor}" não respondeu em ${timeoutEmMs}ms`);
    this.name = 'ErroDeTimeoutDoConsumidor';
  }
}

class AbortoDaTransacaoDoEvento extends Error {
  constructor(
    readonly linha: LinhaDoOutbox,
    readonly causa: ErroDeTimeoutDoConsumidor,
  ) {
    super(causa.message);
    this.name = 'AbortoDaTransacaoDoEvento';
  }
}

function paraEventoDeDominio(linha: LinhaDoOutbox): EventoDeDominio {
  return {
    eventoId: linha.eventoId,
    tipo: linha.tipo,
    ocorridoEm: linha.ocorridoEm,
    agregadoTipo: linha.agregadoTipo,
    agregadoId: linha.agregadoId,
    dados: linha.payload,
  };
}

function paraErro(motivo: unknown): Error {
  return motivo instanceof Error ? motivo : new Error(String(motivo));
}

@Injectable()
export class Despachante implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Despachante.name);
  private temporizador: NodeJS.Timeout | undefined;
  private pararDeOuvirSinal: (() => void) | undefined;
  private cicloAtual: Promise<void> = Promise.resolve();
  private encerrando = false;

  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly registro: RegistroDeConsumidores,
    private readonly sinalizador: SinalizadorDeEventos,
    @Inject(TIMEOUT_DO_CONSUMIDOR_EM_MS) private readonly timeoutDoConsumidorEmMs: number,
  ) {}

  onModuleInit(): void {
    this.temporizador = setInterval(() => this.agendarCiclo(), INTERVALO_DE_POLLING_EM_MS);
    this.pararDeOuvirSinal = this.sinalizador.aoNotificar(() => this.agendarCiclo());
  }

  async onModuleDestroy(): Promise<void> {
    this.encerrando = true;
    if (this.temporizador !== undefined) {
      clearInterval(this.temporizador);
    }
    this.pararDeOuvirSinal?.();
    await this.cicloAtual;
  }

  executarCiclo(): Promise<void> {
    const estaChamada = this.cicloAtual.then(
      () => this.executarUmCiclo(),
      () => this.executarUmCiclo(),
    );
    this.cicloAtual = estaChamada.catch(() => undefined);
    return estaChamada;
  }

  private async executarUmCiclo(): Promise<void> {
    for (let processados = 0; processados < TAMANHO_MAXIMO_DO_CICLO; processados += 1) {
      if (this.encerrando) {
        return;
      }
      // eslint-disable-next-line no-await-in-loop -- cada evento tem que ser processado em sequência, um por transação
      const processouAlgum = await this.processarProximoEvento();
      if (!processouAlgum) {
        return;
      }
    }
  }

  private agendarCiclo(): void {
    ContextoDaRequisicao.foraDeQualquerContexto(() => foraDaTransacaoAtiva(() => this.executarCiclo())).catch(
      (motivo: unknown) => {
        this.logger.error(`falha no ciclo do despachante: ${formatarUltimoErro(paraErro(motivo))}`);
      },
    );
  }

  private async processarProximoEvento(): Promise<boolean> {
    try {
      return await this.unidadeDeTrabalho.transacao('escrita', (contexto) =>
        this.processarEventoNaTransacao(contexto),
      );
    } catch (motivo) {
      if (!(motivo instanceof AbortoDaTransacaoDoEvento)) {
        throw motivo;
      }
      await this.registrarFalhaEmTransacaoSeparada(motivo.linha, motivo.causa);
      return true;
    }
  }

  private async processarEventoNaTransacao(contexto: ContextoDaTransacao): Promise<boolean> {
    const linha = await this.selecionarProximoEvento(contexto);
    if (linha === undefined) {
      return false;
    }

    await this.restabelecerContextoDaInstituicao(contexto, linha.instituicaoId);
    const evento = paraEventoDeDominio(linha);
    const erro = await this.entregarComAbortoIdentificado(contexto, linha, evento);
    if (erro === undefined) {
      await contexto.em.execute('update shared.outbox set publicado_em = now() where id = ?', [linha.id]);
    } else {
      await this.registrarFalha(contexto, linha, erro);
    }

    return true;
  }

  private async entregarComAbortoIdentificado(
    contexto: ContextoDaTransacao,
    linha: LinhaDoOutbox,
    evento: EventoDeDominio,
  ): Promise<Error | undefined> {
    try {
      return await ContextoDaRequisicao.executar(
        { correlacaoId: evento.eventoId, instituicaoId: linha.instituicaoId },
        () => this.entregarAosConsumidores(contexto, evento, linha.tentativas),
      );
    } catch (motivo) {
      throw motivo instanceof ErroDeTimeoutDoConsumidor
        ? new AbortoDaTransacaoDoEvento(linha, motivo)
        : motivo;
    }
  }

  private async selecionarProximoEvento(contexto: ContextoDaTransacao): Promise<LinhaDoOutbox | undefined> {
    const linhas = await contexto.em.execute<LinhaDoOutbox[]>(CONSULTA_DO_PROXIMO_EVENTO);
    return linhas[0];
  }

  private async restabelecerContextoDaInstituicao(
    contexto: ContextoDaTransacao,
    instituicaoId: string,
  ): Promise<void> {
    await contexto.em.execute('select set_config(?, ?, true)', [
      VARIAVEL_DE_SESSAO_DA_INSTITUICAO,
      instituicaoId,
    ]);
  }

  private async entregarAosConsumidores(
    contexto: ContextoDaTransacao,
    evento: EventoDeDominio,
    tentativasAntesDesteCiclo: number,
  ): Promise<Error | undefined> {
    let primeiroErro: Error | undefined;

    for (const consumidor of this.registro.consumidoresPara(evento.tipo)) {
      // eslint-disable-next-line no-await-in-loop -- consumidores da mesma conexão rodam um savepoint por vez
      if (await this.jaProcessado(contexto, consumidor.consumidor, evento.eventoId)) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- consumidores da mesma conexão rodam um savepoint por vez
      const erro = await this.executarComSavepoint(contexto, consumidor, evento);
      if (erro !== undefined) {
        this.logger.warn(
          `consumidor falhou: evento=${evento.eventoId} tipo=${evento.tipo} ` +
            `consumidor=${consumidor.consumidor} tentativas=${tentativasAntesDesteCiclo + 1} motivo=${formatarUltimoErro(erro)}`,
        );
        primeiroErro ??= erro;
      }
    }

    return primeiroErro;
  }

  private async executarComSavepoint(
    contexto: ContextoDaTransacao,
    consumidor: ConsumidorRegistrado,
    evento: EventoDeDominio,
  ): Promise<Error | undefined> {
    await contexto.em.execute(`savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);

    try {
      await contexto.em.execute('set constraints all immediate');
      await contexto.em.execute("select set_config('statement_timeout', ?, true)", [
        String(this.timeoutDoConsumidorEmMs),
      ]);
      await this.executarComTimeout(consumidor, evento);
      await contexto.em.flush();
      await contexto.em.execute('set local statement_timeout to default');
      await this.marcarComoProcessado(contexto, consumidor.consumidor, evento.eventoId);
      await contexto.em.execute(`release savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      return undefined;
    } catch (motivo) {
      if (motivo instanceof ErroDeTimeoutDoConsumidor) {
        await contexto.em.execute(ENCERRAR_TRANSACAO_E_BLOQUEAR_ESCRITA_AVULSA);
        throw motivo;
      }
      contexto.em.clear();
      await contexto.em.execute(`rollback to savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      await contexto.em.execute(`release savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      return paraErro(motivo);
    }
  }

  private async executarComTimeout(consumidor: ConsumidorRegistrado, evento: EventoDeDominio): Promise<void> {
    let temporizadorDoTimeout: NodeJS.Timeout;
    const estouroDoTimeout = new Promise<never>((_resolver, rejeitar) => {
      temporizadorDoTimeout = setTimeout(() => {
        rejeitar(new ErroDeTimeoutDoConsumidor(consumidor.consumidor, this.timeoutDoConsumidorEmMs));
      }, this.timeoutDoConsumidorEmMs + FOLGA_DO_TIMEOUT_DA_APLICACAO_EM_MS);
    });

    try {
      await Promise.race([consumidor.reagir(evento), estouroDoTimeout]);
    } finally {
      clearTimeout(temporizadorDoTimeout!);
    }
  }

  private async jaProcessado(
    contexto: ContextoDaTransacao,
    consumidor: string,
    eventoId: string,
  ): Promise<boolean> {
    const linhas = await contexto.em.execute<{ consumidor: string }[]>(
      'select consumidor from shared.evento_processado where consumidor = ? and evento_id = ?',
      [consumidor, eventoId],
    );
    return linhas.length > 0;
  }

  private async marcarComoProcessado(
    contexto: ContextoDaTransacao,
    consumidor: string,
    eventoId: string,
  ): Promise<void> {
    await contexto.em.execute('insert into shared.evento_processado (consumidor, evento_id) values (?, ?)', [
      consumidor,
      eventoId,
    ]);
  }

  private async registrarFalhaEmTransacaoSeparada(linha: LinhaDoOutbox, erro: Error): Promise<void> {
    await this.unidadeDeTrabalho.transacao('escrita', (contexto) =>
      this.registrarFalha(contexto, linha, erro),
    );
  }

  private async registrarFalha(
    contexto: ContextoDaTransacao,
    linha: LinhaDoOutbox,
    erro: Error,
  ): Promise<void> {
    const registrado = await contexto.em.execute<{ tentativas: number }[]>(
      'update shared.outbox set tentativas = tentativas + 1, ultimo_erro = ? where id = ? and publicado_em is null returning tentativas',
      [formatarUltimoErro(erro), linha.id],
    );
    const tentativas = registrado[0]?.tentativas;
    if (tentativas === undefined) {
      return;
    }

    if (tentativas >= TETO_DE_TENTATIVAS) {
      this.logger.error(
        `evento esgotou o teto de tentativas: evento=${linha.eventoId} tipo=${linha.tipo} tentativas=${tentativas}`,
      );
    }

    await contexto.em.execute('update shared.outbox set proxima_tentativa_em = ? where id = ?', [
      calcularProximaTentativa(tentativas, new Date()),
      linha.id,
    ]);
  }
}
