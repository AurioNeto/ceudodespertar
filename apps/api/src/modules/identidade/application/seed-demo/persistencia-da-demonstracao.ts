import type { UsuarioId } from '@cdd/contracts';

export interface UsuarioExistenteDaDemonstracao {
  readonly id: UsuarioId;
  readonly subjectId: string | null;
}

export abstract class PersistenciaDaDemonstracao {
  abstract instituicaoExiste(id: string): Promise<boolean>;
  abstract existeInstituicaoAlemDe(id: string): Promise<boolean>;
  abstract usuarioPorEmail(email: string): Promise<UsuarioExistenteDaDemonstracao | undefined>;
}
