import type { Permissao } from '@cdd/contracts';

export interface GrupoComPermissoes {
  readonly ativo: boolean;
  readonly permissoes: readonly Permissao[];
}

export class PermissoesEfetivas {
  readonly #permissoes: ReadonlySet<Permissao>;

  private constructor(permissoes: ReadonlySet<Permissao>) {
    this.#permissoes = permissoes;
  }

  static dosGrupos(grupos: readonly GrupoComPermissoes[]): PermissoesEfetivas {
    const permissoes = grupos.filter((grupo) => grupo.ativo).flatMap((grupo) => grupo.permissoes);
    return new PermissoesEfetivas(new Set(permissoes));
  }

  pode(permissao: Permissao): boolean {
    return this.#permissoes.has(permissao);
  }

  get lista(): readonly Permissao[] {
    return [...this.#permissoes].toSorted();
  }
}
