import type { UsuarioId, UsuarioListado } from '@cdd/contracts';

export function semRepetidos(usuarios: readonly UsuarioListado[]): readonly UsuarioListado[] {
  const vistos = new Set<UsuarioId>();
  return usuarios.filter((usuario) => {
    if (vistos.has(usuario.id)) return false;
    vistos.add(usuario.id);
    return true;
  });
}
