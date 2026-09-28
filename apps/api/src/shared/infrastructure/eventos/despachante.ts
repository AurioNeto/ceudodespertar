import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';
import { VARIAVEL_DE_SESSAO_DA_INSTITUICAO } from '../banco/unidade-de-trabalho.mikro-orm.js';
import { calcularProximaTentativa } from './backoff.js';
import type { ConsumidorRegistrado } from './registro-de-consumidores.js';
import { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';

export const TETO_DE_TENTATIVAS = 10;
const TAMANHO_MAXIMO_DO_CICLO = 100;
const INTERVALO_DE_POLLING_EM_MS = 1000;
const SAVEPOINT_DO_CONSUMIDOR = 'evento_consumidor';

const CONSULTA_DO_PROXIMO_EVENTO = `
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
      where anterior.agregado_id = o.agregado_id
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
  private temporizador: NodeJS.Timeout | undefined;
  private pararDeOuvirSinal: (() => void) | undefined;
  private cicloAtual: Promise<void> = Promise.resolve();
  private encerrando = false;

  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly registro: RegistroDeConsumidores,
    private readonly sinalizador: SinalizadorDeEventos,
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

  async executarCiclo(): Promise<void> {
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
    this.cicloAtual = this.cicloAtual.then(() => this.executarCiclo()).catch(() => undefined);
  }

  private async processarProximoEvento(): Promise<boolean> {
    return this.unidadeDeTrabalho.transacao('escrita', async (contexto) => {
      const linha = await this.selecionarProximoEvento(contexto);
      if (linha === undefined) {
        return false;
      }

      await this.restabelecerContextoDaInstituicao(contexto, linha.instituicaoId);
      const evento = paraEventoDeDominio(linha);
      const erro = await this.entregarAosConsumidores(contexto, evento);
      await this.registrarResultado(contexto, linha, erro);

      return true;
    });
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
  ): Promise<Error | undefined> {
    let primeiroErro: Error | undefined;

    for (const consumidor of this.registro.consumidoresPara(evento.tipo)) {
      // eslint-disable-next-line no-await-in-loop -- consumidores da mesma conexão rodam um savepoint por vez
      if (await this.jaProcessado(contexto, consumidor.consumidor, evento.eventoId)) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- consumidores da mesma conexão rodam um savepoint por vez
      const erro = await this.executarComSavepoint(contexto, consumidor, evento);
      if (erro !== undefined && primeiroErro === undefined) {
        primeiroErro = erro;
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
      await consumidor.reagir(evento);
      await this.marcarComoProcessado(contexto, consumidor.consumidor, evento.eventoId);
      await contexto.em.execute(`release savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      return undefined;
    } catch (motivo) {
      await contexto.em.execute(`rollback to savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      await contexto.em.execute(`release savepoint ${SAVEPOINT_DO_CONSUMIDOR}`);
      return paraErro(motivo);
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

  private async registrarResultado(
    contexto: ContextoDaTransacao,
    linha: LinhaDoOutbox,
    erro: Error | undefined,
  ): Promise<void> {
    if (erro === undefined) {
      await contexto.em.execute('update shared.outbox set publicado_em = now() where id = ?', [linha.id]);
      return;
    }

    const tentativas = linha.tentativas + 1;
    const proximaTentativaEm = calcularProximaTentativa(tentativas, new Date());

    await contexto.em.execute(
      'update shared.outbox set tentativas = ?, ultimo_erro = ?, proxima_tentativa_em = ? where id = ?',
      [tentativas, erro.message, proximaTentativaEm, linha.id],
    );
  }
}
