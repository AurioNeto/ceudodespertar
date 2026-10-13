import { describe, expect, it } from 'vitest';
import { FUNDOS_DE_VIDRO, fundoComVidro, rotuloVersalete, vidroLeve } from './estilos';

describe('rotuloVersalete', () => {
  it('é o conjunto de estilos do rótulo em caixa alta que as telas espalham no próprio estilo', () => {
    expect(rotuloVersalete).toEqual({
      font: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      color: 'var(--text-field-label)',
    });
  });
});

describe('vidro', () => {
  it('vidroLeve aplica o desfoque leve com o prefixo do Safari', () => {
    expect(vidroLeve).toEqual({ backdropFilter: 'var(--glass-leve)', WebkitBackdropFilter: 'var(--glass-leve)' });
  });

  it.each([...FUNDOS_DE_VIDRO])('fundoComVidro põe vidro sobre %s', (fundo) => {
    expect(fundoComVidro(fundo)).toEqual({ background: fundo, ...vidroLeve });
  });

  it.each(['transparent', 'var(--bg-sunken)', 'var(--bg-brand)'])('fundoComVidro deixa %s sem vidro', (fundo) => {
    expect(fundoComVidro(fundo)).toEqual({ background: fundo });
  });
});
