import { Injectable } from '@nestjs/common';
import type { PessoaId, TipoPessoa } from '@cdd/contracts';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { LeitorDePessoas } from '../../application/leitor-de-pessoas.js';
import type { ConsultaDePessoas, PessoaComPosicao } from '../../application/leitor-de-pessoas.js';

@Injectable()
export class LeitorDePessoasKysely extends LeitorDePessoas {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }

  ler(consulta: ConsultaDePessoas): Promise<PessoaComPosicao[]> {
    return this.unidade.transacao('leitura', async ({ kysely }) => {
      let leitura = kysely.selectFrom('pessoas.pessoa')
        .select(['id', 'tipo', 'nome', 'documento', 'ativa', 'versao', sql<string>`lower(nome)`.as('chave_de_nome')]);
      if (consulta.busca !== undefined) {
        const padrao = `%${consulta.busca.replace(/[\\%_]/g, (caractere) => `\\${caractere}`)}%`;
        leitura = leitura.where(sql<boolean>`(nome ilike ${padrao} escape '\\' or documento like ${padrao} escape '\\')`);
      }
      if (consulta.depois !== null) {
        leitura = leitura.where(sql<boolean>`(lower(nome), id) > (${consulta.depois.chaveDeNome}, ${consulta.depois.id}::uuid)`);
      }
      const linhas = await leitura.orderBy(sql`lower(nome)`).orderBy('id').limit(consulta.limite).execute();
      return linhas.map(({ chave_de_nome: chaveDeNome, ...linha }) => ({
        pessoa: { ...linha, id: linha.id as PessoaId, tipo: linha.tipo as TipoPessoa },
        posicao: { chaveDeNome, id: linha.id },
      }));
    });
  }
}
