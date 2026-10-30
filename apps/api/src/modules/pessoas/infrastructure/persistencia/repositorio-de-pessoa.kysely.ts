import { Injectable } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import type { PessoaId, TipoPessoa } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { RepositorioDoOutbox } from '../../../../shared/infrastructure/eventos/repositorio-do-outbox.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import { Pessoa } from '../../domain/pessoa/pessoa.js';
import { RepositorioDePessoa } from '../../domain/pessoa/pessoa.repo.js';

@Injectable()
export class RepositorioDePessoaKysely extends RepositorioDePessoa {
  constructor(private readonly unidade: UnidadeDeTrabalho, private readonly outbox: RepositorioDoOutbox) { super(); }

  porId(id: PessoaId): Promise<Pessoa | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('pessoas.pessoa').select(['id', 'tipo', 'nome', 'documento', 'ativa', 'versao'])
        .where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : Pessoa.reconstituir({ ...linha, id: linha.id as PessoaId, tipo: linha.tipo as TipoPessoa });
    });
  }

  adicionar(pessoa: Pessoa): Promise<void> {
    const instituicaoId = instituicaoDoContexto();
    return this.unidade.transacao('escrita', async (contexto) => {
      await contexto.kysely.insertInto('pessoas.pessoa').values({
        id: pessoa.id, instituicao_id: instituicaoId, tipo: pessoa.tipo, nome: pessoa.nome,
        documento: pessoa.documento, ativa: pessoa.ativa, versao: pessoa.versao,
      }).execute();
      await this.outbox.gravar(contexto, pessoa.retirarEventos());
    });
  }

  salvar(pessoa: Pessoa): Promise<number> {
    return this.unidade.transacao('escrita', async (contexto) => {
      const resultado = await contexto.kysely.updateTable('pessoas.pessoa')
        .set({ tipo: pessoa.tipo, nome: pessoa.nome, documento: pessoa.documento, versao: pessoa.versao + 1 })
        .where('id', '=', pessoa.id).where('versao', '=', pessoa.versao).executeTakeFirst();
      if (resultado.numUpdatedRows === 0n) throw OptimisticLockError.lockFailed('Pessoa');
      await this.outbox.gravar(contexto, pessoa.retirarEventos());
      return pessoa.versao + 1;
    });
  }
}
