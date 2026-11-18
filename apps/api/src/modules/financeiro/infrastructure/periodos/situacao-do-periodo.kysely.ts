import { Injectable } from '@nestjs/common';
import { UnidadeDeTrabalho } from '../../../../shared/infrastructure/banco/unidade-de-trabalho.js';
import { SituacaoDoPeriodo } from '../../application/lancamentos/situacao-do-periodo.js';
import type { Competencia, UnidadeId } from '@cdd/contracts';
import type { ChaveDoPeriodo } from '../../domain/periodo/periodo-contabil.repo.js';
import { travarPeriodos } from './trava-de-periodo.js';

@Injectable()
export class SituacaoDoPeriodoKysely extends SituacaoDoPeriodo {
  constructor(private readonly unidade: UnidadeDeTrabalho) { super(); }
  proteger(periodos: readonly ChaveDoPeriodo[]): Promise<void> {
    return this.unidade.transacao('escrita', async ctx => travarPeriodos(ctx, periodos.map(p => ({ ...p, exclusiva: false }))));
  }
  estaAberto(unidadeId: UnidadeId, competencia: Competencia): Promise<boolean> {
    return this.unidade.transacao('escrita', async ctx => {
      await travarPeriodos(ctx, [{ unidadeId, competencia, exclusiva: false }]);
      const fechado = await ctx.kysely.selectFrom('financeiro.periodo_contabil').select('id').where('unidade_id', '=', unidadeId)
        .where('competencia', '=', `${competencia}-01`).where('fechado', '=', true).executeTakeFirst();
      return fechado === undefined;
    });
  }
}
