import type { CodigoGrupo } from '@cdd/contracts';

interface Vinculo {
  readonly codigoSistema: CodigoGrupo | null;
}

export function mesmoTexto(v: Vinculo, s: string): boolean {
  return v.codigoSistema === s;
}
