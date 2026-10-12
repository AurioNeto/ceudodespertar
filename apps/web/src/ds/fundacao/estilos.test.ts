import { describe, expect, it } from 'vitest';
import { rotuloVersalete } from './estilos';

describe('rotuloVersalete', () => {
  it('é o conjunto de estilos do rótulo em caixa alta que as telas espalham no próprio estilo', () => {
    expect(rotuloVersalete).toEqual({
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-field-label)',
    });
  });
});
