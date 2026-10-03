import { PERMISSOES } from '@cdd/contracts';
import { describe, expect, it } from 'vitest';
import { ehPermissaoDoCatalogo } from './catalogo-de-permissoes.js';

describe('ehPermissaoDoCatalogo', () => {
  it('G4: reconhece todas as permissões do catálogo', () => {
    expect(PERMISSOES.every((permissao) => ehPermissaoDoCatalogo(permissao))).toBe(true);
  });

  it('G4: rejeita permissão inventada', () => {
    expect(ehPermissaoDoCatalogo('financeiro.lancamento.inventar')).toBe(false);
  });

  it('G4: rejeita nome herdado do protótipo de objeto', () => {
    expect(ehPermissaoDoCatalogo('toString')).toBe(false);
  });
});
