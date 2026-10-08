import type { GrupoId } from '@cdd/contracts';

export interface ComandoSobrePermissaoDoGrupo {
  readonly grupoId: GrupoId;
  readonly versaoEsperada: number;
  readonly permissao: string;
}
