import { Injectable } from '@nestjs/common';
import type { GrupoDeCustoId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { GrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.js';
import { RepositorioDeGrupoDeCusto } from '../../domain/grupo-de-custo/grupo-de-custo.repo.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

const NOME_DO_AGREGADO = 'GrupoDeCusto';

interface LinhaDoGrupoDeCusto {
  readonly id: string;
  readonly codigo_sistema: string;
  readonly nome: string;
  readonly ativo: boolean;
  readonly versao: number;
}

function reconstituir(linha: LinhaDoGrupoDeCusto): GrupoDeCusto {
  return GrupoDeCusto.reconstituir({
    id: linha.id as GrupoDeCustoId,
    codigoSistema: linha.codigo_sistema,
    nome: linha.nome,
    ativo: linha.ativo,
    versao: linha.versao,
  });
}

@Injectable()
export class RepositorioDeGrupoDeCustoKysely extends RepositorioDeGrupoDeCusto {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  porId(id: GrupoDeCustoId): Promise<GrupoDeCusto | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.grupo_de_custo').selectAll().where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : reconstituir(linha);
    });
  }

  listar(): Promise<readonly GrupoDeCusto[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.grupo_de_custo').selectAll().orderBy('nome').orderBy('id').execute();
      return linhas.map(reconstituir);
    });
  }

  async adicionar(grupo: GrupoDeCusto): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('financeiro.grupo_de_custo')
        .values({
          id: grupo.id,
          instituicao_id: instituicaoId,
          codigo_sistema: grupo.codigoSistema,
          nome: grupo.nome,
          ativo: grupo.ativo,
          versao: grupo.versao,
        })
        .execute();
    });
  }

  salvar(grupo: GrupoDeCusto): Promise<number> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const resultado = await kysely
        .updateTable('financeiro.grupo_de_custo')
        .set({ nome: grupo.nome, ativo: grupo.ativo, versao: grupo.versao + 1 })
        .where('id', '=', grupo.id)
        .where('versao', '=', grupo.versao)
        .executeTakeFirst();
      exigirLinhaAtualizada(resultado, NOME_DO_AGREGADO);
      return grupo.versao + 1;
    });
  }
}
