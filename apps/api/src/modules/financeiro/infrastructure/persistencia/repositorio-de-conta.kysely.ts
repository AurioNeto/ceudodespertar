import { Injectable } from '@nestjs/common';
import type { ContaId, PessoaId, TipoConta, Titularidade, UnidadeId } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { Conta } from '../../domain/conta/conta.js';
import { RepositorioDeConta } from '../../domain/conta/conta.repo.js';
import { exigirLinhaAtualizada } from './trava-otimista.js';

const NOME_DO_AGREGADO = 'Conta';

interface LinhaDaConta {
  readonly id: string;
  readonly nome: string;
  readonly descricao: string;
  readonly tipo: string;
  readonly titularidade: string;
  readonly pessoa_titular_id: string | null;
  readonly identificador_bancario: string | null;
  readonly unidade_id: string | null;
  readonly ativa: boolean;
  readonly versao: number;
}

function reconstituir(linha: LinhaDaConta): Conta {
  return Conta.reconstituir({
    id: linha.id as ContaId,
    nome: linha.nome,
    descricao: linha.descricao,
    tipo: linha.tipo as TipoConta,
    titularidade: linha.titularidade as Titularidade,
    pessoaTitularId: linha.pessoa_titular_id as PessoaId | null,
    identificadorBancario: linha.identificador_bancario,
    unidadeId: linha.unidade_id as UnidadeId | null,
    ativa: linha.ativa,
    versao: linha.versao,
  });
}

@Injectable()
export class RepositorioDeContaKysely extends RepositorioDeConta {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  porId(id: ContaId): Promise<Conta | undefined> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('financeiro.conta').selectAll().where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : reconstituir(linha);
    });
  }

  listar(): Promise<readonly Conta[]> {
    return this.unidadeDeTrabalho.transacao('leitura', async ({ kysely }) => {
      const linhas = await kysely.selectFrom('financeiro.conta').selectAll().orderBy('nome').orderBy('id').execute();
      return linhas.map(reconstituir);
    });
  }

  async adicionar(conta: Conta): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    await this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      await kysely
        .insertInto('financeiro.conta')
        .values({
          id: conta.id,
          instituicao_id: instituicaoId,
          nome: conta.nome,
          descricao: conta.descricao,
          tipo: conta.tipo,
          titularidade: conta.titularidade,
          pessoa_titular_id: conta.pessoaTitularId,
          identificador_bancario: conta.identificadorBancario,
          unidade_id: conta.unidadeId,
          ativa: conta.ativa,
          versao: conta.versao,
        })
        .execute();
    });
  }

  salvar(conta: Conta): Promise<number> {
    return this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
      const resultado = await kysely
        .updateTable('financeiro.conta')
        .set({
          nome: conta.nome,
          descricao: conta.descricao,
          identificador_bancario: conta.identificadorBancario,
          unidade_id: conta.unidadeId,
          ativa: conta.ativa,
          versao: conta.versao + 1,
        })
        .where('id', '=', conta.id)
        .where('versao', '=', conta.versao)
        .executeTakeFirst();
      exigirLinhaAtualizada(resultado, NOME_DO_AGREGADO);
      return conta.versao + 1;
    });
  }
}
