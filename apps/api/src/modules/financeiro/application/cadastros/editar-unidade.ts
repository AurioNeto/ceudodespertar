import { Injectable } from '@nestjs/common';
import type { EditarUnidade as ComandoEditarUnidade, Unidade as UnidadeDoContrato, UnidadeId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { conferirVersao } from '../conferir-versao.js';
import { apresentarUnidade } from './apresentacao-dos-cadastros.js';

export interface ComandoDeEdicaoDaUnidade extends ComandoEditarUnidade {
  readonly unidadeId: UnidadeId;
  readonly versaoEsperada: number;
}

@Injectable()
export class EditarUnidade {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly unidades: RepositorioDeUnidade,
  ) {}

  executar({ unidadeId, versaoEsperada, ...alteracao }: ComandoDeEdicaoDaUnidade): Promise<Result<UnidadeDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<UnidadeDoContrato, ErroDeDominio>> => {
      const encontrada = conferirVersao(await this.unidades.porId(unidadeId), versaoEsperada);
      if (encontrada.tipo === 'erro') return encontrada;
      const unidade = encontrada.valor;

      const alterada = unidade.alterar(alteracao);
      if (alterada.tipo === 'erro') return alterada;

      return ok(apresentarUnidade(unidade, await this.unidades.salvar(unidade)));
    });
  }
}
