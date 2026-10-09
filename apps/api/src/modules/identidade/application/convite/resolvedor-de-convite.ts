import type { InstituicaoId, UsuarioId } from '@cdd/contracts';

export interface DonoDoConvite {
  readonly instituicaoId: InstituicaoId;
  readonly usuarioId: UsuarioId;
}

export abstract class ResolvedorDeConvite {
  abstract resolver(hashDoToken: string): Promise<DonoDoConvite | undefined>;
}
