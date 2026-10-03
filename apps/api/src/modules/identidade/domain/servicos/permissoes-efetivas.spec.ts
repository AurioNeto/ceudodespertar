import type { GrupoId, Permissao } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { unirPermissoesDosGrupos } from './permissoes-efetivas.js';

const GRUPO_A = 'grupo-a' as GrupoId;
const GRUPO_B = 'grupo-b' as GrupoId;
const GRUPO_DESCONHECIDO = 'grupo-desconhecido' as GrupoId;

const PERMISSOES_POR_GRUPO = new Map<GrupoId, ReadonlySet<Permissao>>([
  [GRUPO_A, new Set<Permissao>(['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar'])],
  [GRUPO_B, new Set<Permissao>(['sistema.grupo.gerenciar', 'sistema.parametro.gerenciar'])],
]);

describe('unirPermissoesDosGrupos', () => {
  it('US3: usuário sem grupo não tem permissão alguma', () => {
    expect(unirPermissoesDosGrupos([], PERMISSOES_POR_GRUPO).size).toBe(0);
  });

  it('une as permissões de todos os grupos sem repetir', () => {
    expect(unirPermissoesDosGrupos([GRUPO_A, GRUPO_B], PERMISSOES_POR_GRUPO)).toEqual(
      new Set(['sistema.usuario.gerenciar', 'sistema.grupo.gerenciar', 'sistema.parametro.gerenciar']),
    );
  });

  it('grupo desconhecido não concede nada', () => {
    expect(unirPermissoesDosGrupos([GRUPO_DESCONHECIDO], PERMISSOES_POR_GRUPO).size).toBe(0);
  });
});
