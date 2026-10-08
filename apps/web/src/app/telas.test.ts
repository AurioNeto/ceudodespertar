import { describe, expect, it } from 'vitest';
import { PERMISSOES } from '@cdd/contracts';
import { TELAS } from './telas';
import type { RotaId } from './navegacao';

const LIVRES: readonly RotaId[] = ['painel', 'perfil'];
const registros = Object.entries(TELAS) as [RotaId, (typeof TELAS)[RotaId]][];

describe('registro de telas', () => {
  it.each(registros.filter(([id]) => !LIVRES.includes(id)))('%s exige alguma permissão', (_id, registro) => {
    expect(registro.acesso.length).toBeGreaterThan(0);
  });

  it.each(LIVRES)('%s é livre', (id) => {
    expect(TELAS[id].acesso).toEqual([]);
  });

  it('toda permissão citada existe no catálogo', () => {
    const citadas = registros.flatMap(([, registro]) => registro.acesso);
    expect(citadas.filter((permissao) => !PERMISSOES.includes(permissao))).toEqual([]);
  });

  it('cada tela tem objeto próprio', () => {
    expect(new Set(registros.map(([, registro]) => registro)).size).toBe(registros.length);
  });
});
