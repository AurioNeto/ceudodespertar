import { hoje } from '@/pages/mocks/relogio';
import type { DevolucaoNaFila } from '../mocks/devolucoes';

const COMPETENCIA_ATUAL = hoje.slice(0, 7);

export function competenciaDaSaida(d: DevolucaoNaFila) {
  return d.competenciaFechada ? COMPETENCIA_ATUAL : (d.competenciaOriginal as string);
}
