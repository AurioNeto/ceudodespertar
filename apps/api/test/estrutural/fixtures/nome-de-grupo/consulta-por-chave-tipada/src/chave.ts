import type { CodigoGrupo } from '@cdd/contracts';

export function consultar(ids: Map<string, string>, lista: readonly string[], codigo: CodigoGrupo): boolean[] {
  return [ids.has(codigo), lista.includes(codigo)];
}
