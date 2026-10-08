import type { UsuarioId } from '@cdd/contracts';
import type { Usuario } from './usuario.js';

export interface RepositorioDeUsuario {
  porId(id: UsuarioId): Promise<Usuario | undefined>;
  adicionar(usuario: Usuario): Promise<void>;
  salvar(usuario: Usuario): Promise<void>;
}
