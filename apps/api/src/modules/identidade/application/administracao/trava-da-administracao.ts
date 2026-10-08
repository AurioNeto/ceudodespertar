import type { InstituicaoId } from '@cdd/contracts';

export abstract class TravaDaAdministracao {
  abstract adquirir(instituicaoId: InstituicaoId): Promise<void>;
}
