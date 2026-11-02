import { sql } from 'kysely';
import type { ContextoDaTransacao } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { instituicaoDoContexto } from '../../../../shared/infrastructure/instituicao-do-contexto.js';
import type { ChaveDoPeriodo } from '../../domain/periodo/periodo-contabil.repo.js';

export interface PedidoDeTrava extends ChaveDoPeriodo { readonly exclusiva: boolean; }
export function chaveDaTrava(periodo: ChaveDoPeriodo): string {
  return `financeiro.periodo:${instituicaoDoContexto()}:${periodo.unidadeId}:${periodo.competencia}`;
}
export async function travarPeriodos(ctx: ContextoDaTransacao, pedidos: readonly PedidoDeTrava[]): Promise<void> {
  const unicos = new Map<string, PedidoDeTrava>();
  for (const pedido of pedidos) {
    const chave = chaveDaTrava(pedido);
    if (!unicos.get(chave)?.exclusiva) unicos.set(chave, pedido);
  }
  for (const [chave, pedido] of [...unicos.entries()].toSorted(([a], [b]) => a < b ? -1 : 1)) {
    // eslint-disable-next-line no-await-in-loop -- ordem global de aquisição das travas
    if (pedido.exclusiva) await sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`.execute(ctx.kysely);
    // eslint-disable-next-line no-await-in-loop -- ordem global de aquisição das travas
    else await sql`select pg_advisory_xact_lock_shared(hashtextextended(${chave}, 0))`.execute(ctx.kysely);
  }
}
