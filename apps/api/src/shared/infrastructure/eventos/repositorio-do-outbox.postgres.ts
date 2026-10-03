import { Injectable } from '@nestjs/common';
import type { EventoDeDominio } from '../../kernel/evento-de-dominio.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { ContextoDaTransacao } from '../banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from './repositorio-do-outbox.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';

export class ErroDeInstituicaoAusenteAoGravarEvento extends Error {
  constructor() {
    super('não há instituição ativa no contexto da requisição para gravar o evento no outbox');
    this.name = 'ErroDeInstituicaoAusenteAoGravarEvento';
  }
}

@Injectable()
export class RepositorioDoOutboxPostgres extends RepositorioDoOutbox {
  constructor(private readonly sinalizador: SinalizadorDeEventos) {
    super();
  }

  async gravar(contexto: ContextoDaTransacao, eventos: readonly EventoDeDominio[]): Promise<void> {
    if (eventos.length === 0) {
      return;
    }

    const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
    if (instituicaoId === undefined) {
      throw new ErroDeInstituicaoAusenteAoGravarEvento();
    }

    for (const evento of eventos) {
      // eslint-disable-next-line no-await-in-loop -- ordem de inserção precisa seguir a ordem de emissão dos eventos
      await contexto.em.execute(
        `insert into shared.outbox
           (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, ocorrido_em)
         values (?, ?, ?, ?, ?, ?::jsonb, ?)`,
        [
          evento.eventoId,
          instituicaoId,
          evento.tipo,
          evento.agregadoTipo,
          evento.agregadoId,
          JSON.stringify(evento.dados),
          evento.ocorridoEm,
        ],
      );
    }

    contexto.aoConfirmar(() => this.sinalizador.notificar());
  }
}
