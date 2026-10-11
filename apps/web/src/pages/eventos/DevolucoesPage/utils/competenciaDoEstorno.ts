import type { DevolucaoNaFila } from '../mocks/devolucoes';

const COMPETENCIA_ATUAL = '2026-09';

export function competenciaDoEstorno(d: DevolucaoNaFila) {
  return d.competenciaFechada ? COMPETENCIA_ATUAL : (d.competenciaOriginal as string);
}
