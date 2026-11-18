import { Injectable } from '@nestjs/common';
import type { DataLocal, EventoId, ResumoDeEvento, TipoEvento, UnidadeId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { instituicaoDoContexto } from '../../../shared/infrastructure/instituicao-do-contexto.js';
import { EventosMinimos } from '../application/eventos-minimos.js';

@Injectable()
export class EventosMinimosKysely extends EventosMinimos {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  adicionar(evento: ResumoDeEvento): Promise<void> {
    return this.unidade.transacao('escrita', async ({ kysely }) => {
      await kysely.insertInto('eventos.evento').values({
        id: evento.id, instituicao_id: instituicaoDoContexto(), unidade_id: evento.unidadeId,
        nome: evento.nome, tipo: evento.tipo, data_inicio: evento.dataInicio, data_fim: evento.dataFim,
      }).execute();
    });
  }

  porId(id: EventoId): Promise<ResumoDeEvento | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const evento = await kysely.selectFrom('eventos.evento').selectAll().where('id', '=', id).executeTakeFirst();
      if (!evento) return undefined;
      return {
        id, unidadeId: evento.unidade_id as UnidadeId, nome: evento.nome, tipo: evento.tipo as TipoEvento,
        dataInicio: evento.data_inicio as DataLocal, dataFim: evento.data_fim as DataLocal,
      };
    });
  }
}
