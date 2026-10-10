import type { InstituicaoId, SituacaoUsuario, UsuarioId } from '@cdd/contracts';

export interface SujeitoDoUsuario {
  readonly subjectId: string | null;
  readonly situacao: SituacaoUsuario;
}

export abstract class LeitorDoSujeitoDoUsuario {
  abstract ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<SujeitoDoUsuario | undefined>;
}
