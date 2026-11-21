import type { ItemNaFila } from '@cdd/contracts';
import { COMPETENCIAS_FECHADAS } from '../constantes';

export const emPeriodoFechado = (item: ItemNaFila): boolean =>
  COMPETENCIAS_FECHADAS.some((fechada) => item.data.startsWith(fechada));
