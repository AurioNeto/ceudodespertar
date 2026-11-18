import type { ChaveDoPeriodo } from '../../domain/periodo/periodo-contabil.repo.js';
import type { Competencia, UnidadeId } from '@cdd/contracts';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { erroDeDominio, ErroDeDominioException } from '../../../../shared/kernel/erro-de-dominio.js';
import { travarPeriodos } from './trava-de-periodo.js';

export function periodosDoLancamento(dados: { unidadeId: UnidadeId | null; dataCompetencia: string | null }): ChaveDoPeriodo[] {
  return dados.unidadeId === null || dados.dataCompetencia === null ? [] : [{ unidadeId: dados.unidadeId, competencia: dados.dataCompetencia.slice(0, 7) as Competencia }];
}
export function periodosDaTransferencia(dados: { unidadeId: UnidadeId; unidadeDestinoId: UnidadeId | null; data: string }): ChaveDoPeriodo[] {
  return [dados.unidadeId, dados.unidadeDestinoId].filter(id => id !== null).map(unidadeId => ({ unidadeId, competencia: dados.data.slice(0, 7) as Competencia }));
}
export async function protegerEscrita(ctx: ContextoDaTransacao, periodos: readonly ChaveDoPeriodo[]): Promise<void> {
  await travarPeriodos(ctx, periodos.map(p => ({ ...p, exclusiva: false })));
  if (periodos.length === 0) return;
  const fechado = await ctx.kysely.selectFrom('financeiro.periodo_contabil').select('id').where('fechado', '=', true)
    .where(eb => eb.or(periodos.map(p => eb.and([eb('unidade_id', '=', p.unidadeId), eb('competencia', '=', `${p.competencia}-01`)])))).executeTakeFirst();
  if (fechado !== undefined) throw new ErroDeDominioException(erroDeDominio('PERIODO_FECHADO'));
}
