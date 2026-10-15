import { Injectable } from '@nestjs/common';
import type { Categoria as CategoriaDoContrato, CategoriaId, CriarCategoria as ComandoCriarCategoria } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { ok, type Result } from '../../../../shared/kernel/result.js';
import { Categoria } from '../../domain/categoria/categoria.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { apresentarCategoria } from './apresentacao-dos-cadastros.js';
import { conferirUnidadePadraoDaCategoria } from './conferir-unidade-padrao-da-categoria.js';

@Injectable()
export class CriarCategoria {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly categorias: RepositorioDeCategoria,
    private readonly unidades: RepositorioDeUnidade,
  ) {}

  executar(comando: ComandoCriarCategoria): Promise<Result<CategoriaDoContrato, ErroDeDominio>> {
    return this.unidadeDeTrabalho.transacao('escrita', async (): Promise<Result<CategoriaDoContrato, ErroDeDominio>> => {
      const criada = Categoria.criar({ ...comando, id: gerarUuidV7() as CategoriaId });
      if (criada.tipo === 'erro') return criada;
      const categoria = criada.valor;

      const unidadePadrao = await conferirUnidadePadraoDaCategoria(this.unidades, categoria);
      if (unidadePadrao.tipo === 'erro') return unidadePadrao;

      await this.categorias.adicionar(categoria);
      return ok(apresentarCategoria(categoria));
    });
  }
}
