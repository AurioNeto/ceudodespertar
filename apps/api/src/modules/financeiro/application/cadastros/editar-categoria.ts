import { Injectable } from '@nestjs/common';
import type { Categoria as CategoriaDoContrato, CategoriaId, EditarCategoria as ComandoEditarCategoria } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { conferirVersao } from '../conferir-versao.js';
import { apresentarCategoria } from './apresentacao-dos-cadastros.js';
import { conferirUnidadePadraoDaCategoria } from './conferir-unidade-padrao-da-categoria.js';

export interface ComandoDeEdicaoDaCategoria extends ComandoEditarCategoria {
  readonly categoriaId: CategoriaId;
  readonly versaoEsperada: number;
}

@Injectable()
export class EditarCategoria {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly categorias: RepositorioDeCategoria,
    private readonly unidades: RepositorioDeUnidade,
  ) {}

  executar({
    categoriaId,
    versaoEsperada,
    ...alteracao
  }: ComandoDeEdicaoDaCategoria): Promise<Result<CategoriaDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<CategoriaDoContrato, ErroDeDominio>> => {
      const encontrada = conferirVersao(await this.categorias.porId(categoriaId), versaoEsperada);
      if (encontrada.tipo === 'erro') return encontrada;
      const categoria = encontrada.valor;
      const unidadePadraoAnterior = categoria.unidadePadraoId;

      const alterada = categoria.alterar(alteracao);
      if (alterada.tipo === 'erro') return alterada;

      const unidadePadrao = await conferirUnidadePadraoDaCategoria(this.unidades, categoria, {
        exigirAtiva: categoria.unidadePadraoId !== unidadePadraoAnterior,
      });
      if (unidadePadrao.tipo === 'erro') return unidadePadrao;

      return ok(apresentarCategoria(categoria, await this.categorias.salvar(categoria)));
    });
  }
}
