import { Injectable } from '@nestjs/common';
import type { CategoriasDaCasa, ContasDaCasa, FundosDaCasa, GruposDeCustoDaCasa, UnidadesDaCasa } from '@cdd/contracts';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { RepositorioDeGrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.repo.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { apresentarCategoria, apresentarConta, apresentarFundo, apresentarGrupoDeCusto, apresentarUnidade } from './apresentacao-dos-cadastros.js';

@Injectable()
export class ConsultarCadastros {
  constructor(
    private readonly unidades: RepositorioDeUnidade,
    private readonly gruposDeCusto: RepositorioDeGrupoDeCusto,
    private readonly categorias: RepositorioDeCategoria,
    private readonly contas: RepositorioDeConta,
    private readonly fundos: RepositorioDeFundo,
  ) {}

  async unidadesDaCasa(): Promise<UnidadesDaCasa> {
    return { itens: (await this.unidades.listar()).map((unidade) => apresentarUnidade(unidade)) };
  }

  async gruposDeCustoDaCasa(): Promise<GruposDeCustoDaCasa> {
    return { itens: (await this.gruposDeCusto.listar()).map((grupo) => apresentarGrupoDeCusto(grupo)) };
  }

  async categoriasDaCasa(): Promise<CategoriasDaCasa> {
    return { itens: (await this.categorias.listar()).map((categoria) => apresentarCategoria(categoria)) };
  }

  async contasDaCasa(): Promise<ContasDaCasa> {
    return { itens: (await this.contas.listar()).map((conta) => apresentarConta(conta)) };
  }

  async fundosDaCasa(): Promise<FundosDaCasa> {
    return { itens: (await this.fundos.listar()).map((fundo) => apresentarFundo(fundo)) };
  }
}
