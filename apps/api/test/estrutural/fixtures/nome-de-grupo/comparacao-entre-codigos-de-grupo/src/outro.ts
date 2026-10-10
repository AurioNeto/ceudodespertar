import type { CodigoGrupo } from '@cdd/contracts';

interface Vinculo {
  readonly codigoSistema: CodigoGrupo | null;
}

export function mesmoCodigo(grupo: Vinculo, outro: CodigoGrupo): boolean {
  return grupo.codigoSistema === outro;
}
