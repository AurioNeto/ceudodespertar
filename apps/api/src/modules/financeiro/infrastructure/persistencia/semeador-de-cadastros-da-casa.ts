import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { emContextoDaInstituicao } from '../../../../shared/infrastructure/contexto-da-instituicao.js';
import { SemeadorDaInstituicao } from '../../../../shared/infrastructure/semeadura/semeador-da-instituicao.js';
import { gerarUuidV7 } from '../../../../shared/kernel/ids.js';
import { CATEGORIAS_DA_CASA, GRUPOS_DE_CUSTO_DA_CASA, UNIDADES_DA_CASA } from '../../domain/cadastros-da-casa.js';

const CHAVE_DO_TRAVAMENTO_DO_SEED = 'financeiro.semear-cadastros-da-casa';
const COLUNAS_DO_CODIGO = ['instituicao_id', 'codigo_sistema'] as const;

@Injectable()
export class SemeadorDeCadastrosDaCasa extends SemeadorDaInstituicao {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {
    super();
  }

  semear(instituicaoId: string): Promise<void> {
    return emContextoDaInstituicao(instituicaoId, () =>
      this.unidadeDeTrabalho.transacao('escrita', async ({ kysely }) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${CHAVE_DO_TRAVAMENTO_DO_SEED + instituicaoId}, 0))`.execute(
          kysely,
        );
        await kysely
          .insertInto('financeiro.unidade')
          .values(
            UNIDADES_DA_CASA.map((unidade) => ({
              id: gerarUuidV7(),
              instituicao_id: instituicaoId,
              codigo_sistema: unidade.codigoSistema,
              nome: unidade.nome,
              regime: unidade.regime,
              teto_anual: unidade.tetoAnual,
            })),
          )
          .onConflict((conflito) => conflito.columns(COLUNAS_DO_CODIGO).doNothing())
          .execute();
        await kysely
          .insertInto('financeiro.grupo_de_custo')
          .values(
            GRUPOS_DE_CUSTO_DA_CASA.map((grupo) => ({
              id: gerarUuidV7(),
              instituicao_id: instituicaoId,
              codigo_sistema: grupo.codigoSistema,
              nome: grupo.nome,
            })),
          )
          .onConflict((conflito) => conflito.columns(COLUNAS_DO_CODIGO).doNothing())
          .execute();
        await kysely
          .insertInto('financeiro.categoria')
          .values(
            CATEGORIAS_DA_CASA.map((categoria) => ({
              id: gerarUuidV7(),
              instituicao_id: instituicaoId,
              codigo_sistema: categoria.codigoSistema,
              nome: categoria.nome,
              natureza: categoria.natureza,
              tipo: categoria.tipo,
              regimes_permitidos: [...categoria.regimesPermitidos],
              linha_relatorio: categoria.linhaRelatorio,
            })),
          )
          .onConflict((conflito) => conflito.columns(COLUNAS_DO_CODIGO).doNothing())
          .execute();
      }),
    );
  }
}
