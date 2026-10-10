import type { CodigoGrupo } from '@cdd/contracts';

interface Vinculo {
  readonly codigoSistema: CodigoGrupo | null;
  readonly legado?: CodigoGrupo;
}

export function ehDeSistema(grupo: Vinculo): boolean[] {
  return [grupo.codigoSistema !== null, grupo.codigoSistema != null, grupo.legado === undefined];
}
