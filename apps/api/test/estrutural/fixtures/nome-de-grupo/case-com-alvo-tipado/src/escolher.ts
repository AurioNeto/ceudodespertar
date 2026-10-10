import type { CodigoGrupo } from '@cdd/contracts';

export function escolher(codigo: CodigoGrupo, s: string): number {
  switch (codigo) {
    case s:
      return 1;
    default:
      return 0;
  }
}
