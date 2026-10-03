import type { GrupoId, Permissao } from '@cdd/contracts';

export function unirPermissoesDosGrupos(
  grupoIds: readonly GrupoId[],
  permissoesPorGrupo: ReadonlyMap<GrupoId, ReadonlySet<Permissao>>,
): ReadonlySet<Permissao> {
  const efetivas = new Set<Permissao>();
  for (const grupoId of grupoIds) {
    for (const permissao of permissoesPorGrupo.get(grupoId) ?? []) efetivas.add(permissao);
  }
  return efetivas;
}
