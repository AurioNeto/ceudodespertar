import type { InstituicaoId, UsuarioId } from '@cdd/contracts';

export interface DonoDoSujeito {
  readonly instituicaoId: InstituicaoId;
  readonly usuarioId: UsuarioId;
}

export abstract class ResolvedorDeSujeito {
  abstract resolver(sujeito: string): Promise<DonoDoSujeito | undefined>;
}
