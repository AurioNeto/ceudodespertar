import { afterEach, describe, expect, it } from 'vitest';
import { AmountDisplay, type AmountSize, type NaturezaVisual } from './AmountDisplay';
import { desmontarTudo, elemento, montar } from './apoioDeRender';

afterEach(desmontarTudo);

const SINAL_DE_MENOS = '− ';
const SINAL_DE_MAIS = '+ ';

const valorDe = (container: HTMLElement) => elemento<HTMLSpanElement>(container, ':scope > span > span:last-child');
const raizDe = (container: HTMLElement) => elemento<HTMLSpanElement>(container, ':scope > span');

const SINAL_E_COR_POR_NATUREZA: readonly [NaturezaVisual, string, string][] = [
  ['receita', SINAL_DE_MAIS, 'var(--color-confirmed)'],
  ['despesa', SINAL_DE_MENOS, 'var(--color-attention)'],
  ['neutral', '', 'var(--text-primary)'],
];

const FONTE_POR_TAMANHO: readonly [AmountSize, string, string, string][] = [
  ['sm', 'var(--text-amount)', '', ''],
  ['md', 'var(--text-amount)', '16.5px', ''],
  ['lg', 'var(--text-amount-lg)', '', ''],
  ['hero', 'var(--text-amount-hero)', '', 'var(--tracking-amount)'],
];

const VALOR_FORMATADO: readonly [number, string][] = [
  [0, '0,00'],
  [5, '5,00'],
  [0.5, '0,50'],
  [1234.5, '1.234,50'],
  [1234567.89, '1.234.567,89'],
  [10.999, '11,00'],
  [10.994, '10,99'],
  [-50, '-50,00'],
];

describe('AmountDisplay — sinal e cor pela natureza', () => {
  it.each(SINAL_E_COR_POR_NATUREZA)('natureza %s — sinal "%s" antes do valor', async (natureza, sinal) => {
    const { container } = await montar(<AmountDisplay value={1234.5} nature={natureza} />);

    expect(valorDe(container).textContent).toBe(`${sinal}1.234,50`);
  });

  it.each(SINAL_E_COR_POR_NATUREZA)('natureza %s — colore o valor', async (natureza, _sinal, cor) => {
    const { container } = await montar(<AmountDisplay value={10} nature={natureza} />);

    expect(raizDe(container).style.color).toBe(cor);
  });

  it('sem natureza — é neutra, sem sinal', async () => {
    const { container } = await montar(<AmountDisplay value={10} />);

    expect(valorDe(container).textContent).toBe('10,00');
    expect(raizDe(container).style.color).toBe('var(--text-primary)');
  });

  it('despesa com valor negativo — soma o sinal de despesa ao hífen do número', async () => {
    const { container } = await montar(<AmountDisplay value={-50} nature="despesa" />);

    expect(valorDe(container).textContent).toBe(`${SINAL_DE_MENOS}-50,00`);
  });

  it('receita com valor zero — mostra o sinal de mais', async () => {
    const { container } = await montar(<AmountDisplay value={0} nature="receita" />);

    expect(valorDe(container).textContent).toBe(`${SINAL_DE_MAIS}0,00`);
  });
});

describe('AmountDisplay — formatação em reais', () => {
  it.each(VALOR_FORMATADO)('valor %s — aparece como %s', async (valor, esperado) => {
    const { container } = await montar(<AmountDisplay value={valor} />);

    expect(valorDe(container).textContent).toBe(esperado);
  });
});

describe('AmountDisplay — moeda', () => {
  it('sem currency — mostra o R$ antes do valor', async () => {
    const { container } = await montar(<AmountDisplay value={10} />);

    expect(container.textContent).toBe('R$10,00');
  });

  it('currency false — omite o R$', async () => {
    const { container } = await montar(<AmountDisplay value={10} currency={false} />);

    expect(container.textContent).toBe('10,00');
  });

  it('com sinal e moeda — o R$ vem antes do sinal', async () => {
    const { container } = await montar(<AmountDisplay value={10} nature="despesa" />);

    expect(container.textContent).toBe(`R$${SINAL_DE_MENOS}10,00`);
  });
});

describe('AmountDisplay — tamanho e apresentação', () => {
  it.each(FONTE_POR_TAMANHO)('tamanho %s — aplica a fonte do tamanho', async (tamanho, fonte, tamanhoDaFonte, espacamento) => {
    const { container } = await montar(<AmountDisplay value={10} size={tamanho} />);

    const raiz = raizDe(container);
    expect([raiz.style.font, raiz.style.fontSize, raiz.style.letterSpacing]).toEqual([fonte, tamanhoDaFonte, espacamento]);
  });

  it('sem tamanho — usa o médio', async () => {
    const { container } = await montar(<AmountDisplay value={10} />);

    expect(raizDe(container).style.fontSize).toBe('16.5px');
  });

  it('valor — é marcado como numérico, com algarismos tabulares e sem quebra de linha', async () => {
    const { container } = await montar(<AmountDisplay value={10} />);

    const raiz = raizDe(container);
    expect(raiz.hasAttribute('data-numeric')).toBe(true);
    expect([raiz.style.fontVariantNumeric, raiz.style.whiteSpace]).toEqual(['tabular-nums', 'nowrap']);
  });

  it('style próprio — sobrepõe a cor da natureza', async () => {
    const { container } = await montar(<AmountDisplay value={10} nature="receita" style={{ color: 'red' }} />);

    expect(raizDe(container).style.color).toBe('red');
  });

  it('style próprio — sobrepõe a fonte do tamanho', async () => {
    const { container } = await montar(<AmountDisplay value={10} size="hero" style={{ fontSize: '40px' }} />);

    expect(raizDe(container).style.fontSize).toBe('40px');
  });
});
