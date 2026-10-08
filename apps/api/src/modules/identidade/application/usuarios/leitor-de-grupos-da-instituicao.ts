import type { CodigoGrupo, GrupoId, GrupoResumido } from '@cdd/contracts';

export abstract class LeitorDeGruposDaInstituicao {
  abstract ativosPorIds(ids: readonly GrupoId[]): Promise<GrupoResumido[]>;
  abstract doSistema(codigo: CodigoGrupo): Promise<GrupoResumido | undefined>;
}
