import { Injectable } from '@nestjs/common';
import type { CriarEventoMinimo, EventoId, ResumoDeEvento } from '@cdd/contracts';
import { EventosMinimos } from '../../../eventos/public-api.js';
import { erroDeDominio, type ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { err, ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';

@Injectable()
export class OperacoesDeEventoMinimo {
  constructor(private readonly unidades: RepositorioDeUnidade, private readonly eventos: EventosMinimos) {}

  async criar(dados: CriarEventoMinimo): Promise<Result<ResumoDeEvento, ErroDeDominio>> {
    const unidade = await this.unidades.porId(dados.unidadeId);
    if (!unidade) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
    if (!unidade.ativa) return err(erroDeDominio('CADASTRO_INATIVO'));
    const evento = { ...dados, id: gerarUuidV7() as EventoId };
    await this.eventos.adicionar(evento);
    return ok(evento);
  }

  async obter(id: EventoId): Promise<Result<ResumoDeEvento, ErroDeDominio>> {
    const evento = await this.eventos.porId(id);
    return evento ? ok(evento) : err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
  }
}
