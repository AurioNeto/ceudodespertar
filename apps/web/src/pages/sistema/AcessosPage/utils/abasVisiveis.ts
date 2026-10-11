import type { Aba } from '../constantes';

interface PermissoesDasAbas {
  readonly podeGerenciarUsuarios: boolean;
  readonly podeVerGrupos: boolean;
}

export function abasVisiveis({ podeGerenciarUsuarios, podeVerGrupos }: PermissoesDasAbas): readonly Aba[] {
  return [...(podeGerenciarUsuarios ? (['usuarios'] as const) : []), ...(podeVerGrupos ? (['grupos'] as const) : [])];
}
