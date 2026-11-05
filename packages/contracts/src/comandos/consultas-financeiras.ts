import { z } from 'zod';
import { competenciaValida, dataLocalValida, uuidEmMinusculas } from '../entrada.js';
import type { UnidadeId } from '../kernel.js';

const competencia = competenciaValida().refine(valor => valor.slice(0, 4) !== '0000');
export const FiltroDeUnidadeFinanceira = z.object({ unidadeId: uuidEmMinusculas<UnidadeId>().optional() });
export type FiltroDeUnidadeFinanceira = z.infer<typeof FiltroDeUnidadeFinanceira>;

export const FiltroDeListaFinanceira = FiltroDeUnidadeFinanceira.extend({
  pagina: z.coerce.number().int().min(1).max(100_000).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});
export type FiltroDeListaFinanceira = z.infer<typeof FiltroDeListaFinanceira>;

export const FiltroDeListaPorCompetencia = FiltroDeListaFinanceira.extend({ competencia: competencia.optional() });
export type FiltroDeListaPorCompetencia = z.infer<typeof FiltroDeListaPorCompetencia>;

export const FiltroDeResultadoFinanceiro = FiltroDeUnidadeFinanceira.extend({ competencia: competencia.optional() });
export type FiltroDeResultadoFinanceiro = z.infer<typeof FiltroDeResultadoFinanceiro>;

export const FiltroDaDre = FiltroDeUnidadeFinanceira.extend({ competencia });
export type FiltroDaDre = z.infer<typeof FiltroDaDre>;

export const FiltroDoFluxoDeCaixa = FiltroDeUnidadeFinanceira.extend({
  de: dataLocalValida(),
  ate: dataLocalValida(),
}).refine(filtro => filtro.de <= filtro.ate, { path: ['ate'], message: 'O fim deve ser igual ou posterior ao início' });
export type FiltroDoFluxoDeCaixa = z.infer<typeof FiltroDoFluxoDeCaixa>;
