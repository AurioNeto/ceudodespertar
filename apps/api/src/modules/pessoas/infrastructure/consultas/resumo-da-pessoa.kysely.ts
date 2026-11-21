import { Injectable } from '@nestjs/common';
import type { PessoaId, TipoPessoa } from '@cdd/contracts';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { ResumoDaPessoa } from '../../application/resumo-da-pessoa.js';
import type { PessoaResumida } from '../../application/resumo-da-pessoa.js';

@Injectable()
export class ResumoDaPessoaKysely extends ResumoDaPessoa {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  porId(id: PessoaId): Promise<PessoaResumida | undefined> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      const linha = await kysely.selectFrom('pessoas.pessoa').select(['id', 'nome', 'tipo', 'ativa'])
        .where('id', '=', id).executeTakeFirst();
      return linha === undefined ? undefined : { ...linha, id: linha.id as PessoaId, tipo: linha.tipo as TipoPessoa };
    });
  }
}
