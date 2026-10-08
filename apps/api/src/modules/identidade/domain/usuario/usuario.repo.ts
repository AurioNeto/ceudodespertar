import type { UsuarioId } from '@cdd/contracts';
import type { Usuario } from './usuario.js';

export abstract class RepositorioDeUsuario {
  abstract porId(id: UsuarioId): Promise<Usuario | undefined>;
  abstract adicionar(usuario: Usuario): Promise<void>;
  abstract salvar(usuario: Usuario): Promise<number>;
}
