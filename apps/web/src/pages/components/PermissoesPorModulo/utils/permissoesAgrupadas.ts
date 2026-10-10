import { CATALOGO_DE_PERMISSOES } from '@cdd/contracts';
import type { Permissao } from '@cdd/contracts';

export const MODULO_SEM_CATALOGO = 'outras';

export interface PermissaoExibida {
  readonly codigo: string;
  readonly descricao: string | null;
}

export interface ModuloDePermissoes {
  readonly modulo: string;
  readonly permissoes: readonly PermissaoExibida[];
}

type EntradaDoCatalogo = { readonly modulo: string; readonly descricao: string };

const catalogo: Readonly<Record<string, EntradaDoCatalogo | undefined>> = CATALOGO_DE_PERMISSOES;

export function agruparPermissoes(codigos: readonly Permissao[]): readonly ModuloDePermissoes[] {
  const porModulo = new Map<string, PermissaoExibida[]>();
  for (const codigo of codigos) {
    const entrada = Object.hasOwn(CATALOGO_DE_PERMISSOES, codigo) ? catalogo[codigo] : undefined;
    const modulo = entrada?.modulo ?? MODULO_SEM_CATALOGO;
    const lista = porModulo.get(modulo) ?? [];
    lista.push({ codigo, descricao: entrada?.descricao ?? null });
    porModulo.set(modulo, lista);
  }
  return [...porModulo.entries()]
    .sort(([a], [b]) => (a === MODULO_SEM_CATALOGO ? 1 : b === MODULO_SEM_CATALOGO ? -1 : a.localeCompare(b)))
    .map(([modulo, permissoes]) => ({
      modulo,
      permissoes: [...permissoes].sort((a, b) => a.codigo.localeCompare(b.codigo)),
    }));
}
