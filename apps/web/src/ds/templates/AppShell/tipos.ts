import type { NavLink } from './navegacao';

export interface GrupoDoMenu {
  readonly posicao: number;
  readonly secao: string | null;
  readonly itens: NavLink[];
}

export interface AppShellBrand {
  lines: readonly string[];
  tagline: string;
}
