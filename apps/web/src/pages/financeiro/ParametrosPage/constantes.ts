import type { RegimeDaUnidade } from '@cdd/contracts';

export type Aba = 'categorias' | 'unidades' | 'casa';

export const REGIME_ROTULO: Record<RegimeDaUnidade, string> = {
  CONTRIBUICAO: 'Contribuição',
  COMERCIAL: 'Comercial',
};
