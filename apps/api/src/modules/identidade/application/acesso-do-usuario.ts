import type { InstituicaoId, UsuarioId } from '@cdd/contracts';

export interface AcessoDoUsuario {
  readonly usuarioId: UsuarioId;
  readonly instituicaoId: InstituicaoId;
}
