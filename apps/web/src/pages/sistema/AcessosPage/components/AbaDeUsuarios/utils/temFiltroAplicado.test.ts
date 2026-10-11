import { describe, expect, it } from 'vitest';
import type { GrupoId } from '@cdd/contracts';
import { SEM_FILTRO } from '../../../consultas';
import { temFiltroAplicado } from './temFiltroAplicado';

describe('temFiltroAplicado', () => {
  it('é falso sem filtro e com busca em branco', () => {
    expect(temFiltroAplicado(SEM_FILTRO)).toBe(false);
    expect(temFiltroAplicado({ ...SEM_FILTRO, busca: '  ' })).toBe(false);
  });

  it.each([
    { ...SEM_FILTRO, situacao: 'ATIVO' as const },
    { ...SEM_FILTRO, grupoId: 'g-1' as GrupoId },
    { ...SEM_FILTRO, busca: 'x' },
  ])('é verdadeiro com %o', (filtro) => {
    expect(temFiltroAplicado(filtro)).toBe(true);
  });
});
