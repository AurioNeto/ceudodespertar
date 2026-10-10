import type { CodigoGrupo } from '@cdd/contracts';

export function mesmoGrupo(a: CodigoGrupo, b: string): boolean {
  return a === b;
}

export function dentro(lista: readonly CodigoGrupo[]): boolean {
  return lista.some((codigo) => codigo.length > 0);
}
