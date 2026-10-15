import { Injectable } from '@nestjs/common';
import type { RegimeDaUnidade, UnidadeId } from '@cdd/contracts';
import type { Dinheiro } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { Unidade } from '../../domain/unidade/unidade.js';
import { RepositorioDeUnidade } from '../../domain/unidade/unidade.repo.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

const NOME_DO_AGREGADO = 'Unidade';

interface LinhaDaUnidade {
  readonly id: string;
  readonly codigo_sistema: string;
  readonly nome: string;
  readonly regime: string;
  readonly teto_anual: number | null;
  readonly ativa: boolean;
  readonly versao: number;
}

function reconstituir(linha: LinhaDaUnidade): Unidade {
  return Unidade.reconstituir({
    id: linha.id as UnidadeId,
    codigoSistema: linha.codigo_sistema,
    nome: linha.nome,
    regime: linha.regime as RegimeDaUnidade,
    tetoAnual: linha.teto_anual as Dinheiro | null,
    ativa: linha.ativa,
    versao: linha.versao,
  });
}

@Injectable()
export class RepositorioDeUnidadeKysely extends RepositorioDeUnidade {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  porId(id: UnidadeId): Promise<Unidade | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.unidade').selectAll().where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : reconstituir(linha);
    });
  }

  listar(): Promise<readonly Unidade[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.unidade').selectAll().orderBy('nome').orderBy('id').execute();
      return linhas.map(reconstituir);
    });
  }

  async adicionar(unidade: Unidade): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('financeiro.unidade')
        .values({
          id: unidade.id,
          instituicao_id: instituicaoId,
          codigo_sistema: unidade.codigoSistema,
          nome: unidade.nome,
          regime: unidade.regime,
          teto_anual: unidade.tetoAnual,
          ativa: unidade.ativa,
          versao: unidade.versao,
        })
        .execute();
    });
  }

  salvar(unidade: Unidade): Promise<number> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const resultado = await kysely
        .updateTable('financeiro.unidade')
        .set({
          nome: unidade.nome,
          regime: unidade.regime,
          teto_anual: unidade.tetoAnual,
          ativa: unidade.ativa,
          versao: unidade.versao + 1,
        })
        .where('id', '=', unidade.id)
        .where('versao', '=', unidade.versao)
        .executeTakeFirst();
      exigirLinhaAtualizada(resultado, NOME_DO_AGREGADO);
      return unidade.versao + 1;
    });
  }
}
