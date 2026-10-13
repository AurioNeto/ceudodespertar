import { sql } from 'kysely';
import type { Kysely, RawBuilder } from 'kysely';
import type { DB } from '../banco/banco-cdd.gerado.js';

export const RETENCAO_DOS_DESPACHADOS_EM_DIAS = 30;
export const TAMANHO_DO_LOTE_DO_EXPURGO = 1_000;

function despachadoAntesDaRetencao(): RawBuilder<boolean> {
  return sql<boolean>`publicado_em < now() - make_interval(days => ${RETENCAO_DOS_DESPACHADOS_EM_DIAS})`;
}

export function consultaDeApagarLoteDeDespachados(kysely: Kysely<DB>, instituicaoId: string) {
  return kysely
    .deleteFrom('shared.outbox')
    .where('id', 'in', (subconsulta) =>
      subconsulta
        .selectFrom('shared.outbox')
        .select('id')
        .where('instituicao_id', '=', instituicaoId)
        .where('publicado_em', 'is not', null)
        .where(despachadoAntesDaRetencao())
        .orderBy('publicado_em')
        .limit(TAMANHO_DO_LOTE_DO_EXPURGO),
    );
}

export async function apagarLoteDeDespachados(kysely: Kysely<DB>, instituicaoId: string): Promise<number> {
  const resultado = await consultaDeApagarLoteDeDespachados(kysely, instituicaoId).executeTakeFirst();
  return Number(resultado.numDeletedRows);
}
