import { Injectable } from '@nestjs/common';
import type { EventoId, FiltroDeResultadoFinanceiro, ResultadoDeCerimonia } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { EventosMinimos } from '../../../eventos/public-api.js';
import { ConsultasDeResultado } from './consultas-financeiras.js';

@Injectable()
export class ResultadoFinanceiroDaCerimonia {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly eventos: EventosMinimos,
    private readonly resultados: ConsultasDeResultado) {}

  consultar(id: EventoId, filtro: FiltroDeResultadoFinanceiro): Promise<Result<ResultadoDeCerimonia, ErroDeDominio>> {
    return this.unidade.transacao('leitura', async () => {
      const evento = await this.eventos.porId(id);
      if (evento === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
      return ok({ evento, ...await this.resultados.porEvento(id, filtro) });
    });
  }
}
