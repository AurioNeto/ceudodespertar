import { describe, expect, it } from 'vitest';
import { rotuloCaixaAlta } from './estilos';

describe('rotuloCaixaAlta', () => {
  it('é o conjunto de estilos do rótulo em caixa alta que as telas espalham no próprio estilo', () => {
    expect(rotuloCaixaAlta).toEqual({
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--text-field-label)',
    });
  });
});
