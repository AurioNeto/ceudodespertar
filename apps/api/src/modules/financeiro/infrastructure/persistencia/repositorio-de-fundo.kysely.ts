import { Injectable } from '@nestjs/common';
import type { ContaId, Dinheiro, FundoId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { Fundo } from '../../domain/fundo/fundo.js';
import { RepositorioDeFundo } from '../../domain/fundo/fundo.repo.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

const NOME_DO_AGREGADO = 'Fundo';

interface LinhaDoFundo {
  readonly id: string;
  readonly codigo_sistema: string;
  readonly nome: string;
  readonly nota: string;
  readonly conta_vinculada_id: string;
  readonly meta: number | null;
  readonly categorias_permitidas: string[];
  readonly ativo: boolean;
  readonly versao: number;
}

function reconstituir(linha: LinhaDoFundo): Fundo {
  return Fundo.reconstituir({
    id: linha.id as FundoId,
    codigoSistema: linha.codigo_sistema,
    nome: linha.nome,
    nota: linha.nota,
    contaVinculadaId: linha.conta_vinculada_id as ContaId,
    meta: linha.meta as Dinheiro | null,
    categoriasPermitidas: linha.categorias_permitidas,
    ativo: linha.ativo,
    versao: linha.versao,
  });
}

@Injectable()
export class RepositorioDeFundoKysely extends RepositorioDeFundo {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  porId(id: FundoId): Promise<Fundo | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.fundo').selectAll().where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : reconstituir(linha);
    });
  }

  listar(): Promise<readonly Fundo[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.fundo').selectAll().orderBy('nome').orderBy('id').execute();
      return linhas.map(reconstituir);
    });
  }

  async adicionar(fundo: Fundo): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('financeiro.fundo')
        .values({
          id: fundo.id,
          instituicao_id: instituicaoId,
          codigo_sistema: fundo.codigoSistema,
          nome: fundo.nome,
          nota: fundo.nota,
          conta_vinculada_id: fundo.contaVinculadaId,
          meta: fundo.meta,
          categorias_permitidas: [...fundo.categoriasPermitidas],
          ativo: fundo.ativo,
          versao: fundo.versao,
        })
        .execute();
    });
  }

  salvar(fundo: Fundo): Promise<number> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const resultado = await kysely
        .updateTable('financeiro.fundo')
        .set({
          nome: fundo.nome,
          conta_vinculada_id: fundo.contaVinculadaId,
          nota: fundo.nota,
          meta: fundo.meta,
          categorias_permitidas: [...fundo.categoriasPermitidas],
          ativo: fundo.ativo,
          versao: fundo.versao + 1,
        })
        .where('id', '=', fundo.id)
        .where('versao', '=', fundo.versao)
        .executeTakeFirst();
      exigirLinhaAtualizada(resultado, NOME_DO_AGREGADO);
      return fundo.versao + 1;
    });
  }
}
