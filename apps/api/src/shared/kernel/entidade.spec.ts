import { describe, expect, it } from 'vitest';
import { Entidade } from './entidade.js';

class EntidadeDeTeste extends Entidade<string> {
  constructor(id: string) {
    super(id);
  }
}

describe('Entidade', () => {
  it('é igual a outra entidade com o mesmo id', () => {
    expect(new EntidadeDeTeste('id-1').igual(new EntidadeDeTeste('id-1'))).toBe(true);
  });

  it('não é igual a outra entidade com id diferente', () => {
    expect(new EntidadeDeTeste('id-1').igual(new EntidadeDeTeste('id-2'))).toBe(false);
  });
});
