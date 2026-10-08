import type { GrupoId, Permissao, SituacaoUsuario, UsuarioId } from '@cdd/contracts';

export interface UsuarioDaAdministracao {
  readonly id: UsuarioId;
  readonly situacao: SituacaoUsuario;
  readonly grupos: readonly GrupoId[];
}

export interface GrupoAtivoDaAdministracao {
  readonly id: GrupoId;
  readonly permissoes: readonly Permissao[];
}

export interface FotografiaDaAdministracao {
  readonly usuarios: readonly UsuarioDaAdministracao[];
  readonly gruposAtivos: readonly GrupoAtivoDaAdministracao[];
}

export abstract class LeitorDaAdministracao {
  abstract instituicao(): Promise<FotografiaDaAdministracao>;
}
