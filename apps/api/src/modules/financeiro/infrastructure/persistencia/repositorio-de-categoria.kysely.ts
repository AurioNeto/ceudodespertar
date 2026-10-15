import { Injectable } from '@nestjs/common';
import type { CategoriaId, Natureza, RegimeDaUnidade, TipoCategoria, UnidadeId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Categoria } from '../../domain/categoria/categoria.js';
import { RepositorioDeCategoria } from '../../domain/categoria/categoria.repo.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

const NOME_DO_AGREGADO = 'Categoria';

interface LinhaDaCategoria {
  readonly id: string;
  readonly codigo_sistema: string;
  readonly nome: string;
  readonly natureza: string;
  readonly tipo: string;
  readonly regimes_permitidos: string[];
  readonly unidade_padrao_id: string | null;
  readonly linha_relatorio: string;
  readonly ativa: boolean;
  readonly versao: number;
}

function reconstituir(linha: LinhaDaCategoria): Categoria {
  return Categoria.reconstituir({
    id: linha.id as CategoriaId,
    codigoSistema: linha.codigo_sistema,
    nome: linha.nome,
    natureza: linha.natureza as Natureza,
    tipo: linha.tipo as TipoCategoria,
    regimesPermitidos: linha.regimes_permitidos as RegimeDaUnidade[],
    unidadePadraoId: linha.unidade_padrao_id as UnidadeId | null,
    linhaRelatorio: linha.linha_relatorio,
    ativa: linha.ativa,
    versao: linha.versao,
  });
}

@Injectable()
export class RepositorioDeCategoriaKysely extends RepositorioDeCategoria {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  porId(id: CategoriaId): Promise<Categoria | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.categoria').selectAll().where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : reconstituir(linha);
    });
  }

  listar(): Promise<readonly Categoria[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.categoria').selectAll().orderBy('nome').orderBy('id').execute();
      return linhas.map(reconstituir);
    });
  }

  async adicionar(categoria: Categoria): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('financeiro.categoria')
        .values({
          id: categoria.id,
          instituicao_id: instituicaoId,
          codigo_sistema: categoria.codigoSistema,
          nome: categoria.nome,
          natureza: categoria.natureza,
          tipo: categoria.tipo,
          regimes_permitidos: [...categoria.regimesPermitidos],
          unidade_padrao_id: categoria.unidadePadraoId,
          linha_relatorio: categoria.linhaRelatorio,
          ativa: categoria.ativa,
          versao: categoria.versao,
        })
        .execute();
    });
  }

  salvar(categoria: Categoria): Promise<number> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const resultado = await kysely
        .updateTable('financeiro.categoria')
        .set({
          nome: categoria.nome,
          regimes_permitidos: [...categoria.regimesPermitidos],
          unidade_padrao_id: categoria.unidadePadraoId,
          linha_relatorio: categoria.linhaRelatorio,
          ativa: categoria.ativa,
          versao: categoria.versao + 1,
        })
        .where('id', '=', categoria.id)
        .where('versao', '=', categoria.versao)
        .executeTakeFirst();
      exigirLinhaAtualizada(resultado, NOME_DO_AGREGADO);
      return categoria.versao + 1;
    });
  }
}
