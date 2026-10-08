import type { Eu, InstituicaoId, UsuarioId } from '@cdd/contracts';

export abstract class LeitorDoEu {
  abstract ler(usuarioId: UsuarioId, instituicaoId: InstituicaoId): Promise<Eu>;
}
