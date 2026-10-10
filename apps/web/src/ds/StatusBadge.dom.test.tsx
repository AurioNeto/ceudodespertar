import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge, type BadgeTone } from './StatusBadge';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';
import { atributosComTexto } from './apoioDeTeste';

afterEach(desmontarTudo);

const TEXTO_DO_CONSUMIDOR = 'Texto do consumidor';

const selo = (container: HTMLElement) => elemento<HTMLSpanElement>(container, ':scope > span');

const CORES_POR_TOM: readonly [BadgeTone, string, string][] = [
  ['pending', 'var(--color-pending-soft)', 'var(--color-pending)'],
  ['confirmed', 'var(--color-confirmed-soft)', 'var(--color-confirmed)'],
  ['attention', 'var(--color-attention-soft)', 'var(--color-attention)'],
  ['neutral', 'var(--color-neutral-soft)', 'var(--color-neutral)'],
  ['suggest', 'var(--color-suggest-soft)', 'var(--color-suggest)'],
  ['royal', 'var(--color-royal-soft)', 'var(--color-royal-ink)'],
];

describe('StatusBadge — tom e texto', () => {
  it('sem tom — usa o pendente', async () => {
    const { container } = await montar(<StatusBadge>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(container.textContent).toBe(TEXTO_DO_CONSUMIDOR);
    expect(selo(container).style.color).toBe('var(--color-pending)');
  });

  it.each(CORES_POR_TOM)('tom %s — o texto vem só dos filhos, sem rótulo próprio do tom', async (tom) => {
    const { container } = await montar(<StatusBadge tone={tom}>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(container.textContent).toBe(TEXTO_DO_CONSUMIDOR);
  });

  it.each(CORES_POR_TOM)('tom %s — aplica fundo suave e cor do texto do tom', async (tom, fundo, cor) => {
    const { container } = await montar(<StatusBadge tone={tom}>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    const elementoDoSelo = selo(container);
    expect([elementoDoSelo.style.background, elementoDoSelo.style.color]).toEqual([fundo, cor]);
  });

  it('filhos nulos — o selo fica sem texto, sem cair em rótulo do tom', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">{null}</StatusBadge>);

    expect(container.textContent).toBe('');
  });

  it.each(CORES_POR_TOM)('textos vazios — tom %s: o selo fica sem texto, sem escrever o próprio', async (tom) => {
    const { container } = await montar(<StatusBadge tone={tom}>{''}</StatusBadge>);

    expect(container.textContent).toBe('');
    expect(atributosComTexto(container)).toEqual([]);
  });

  it('textos vazios — sem tom e sem filhos em string: o selo fica sem texto', async () => {
    const { container } = await montar(<StatusBadge>{''}</StatusBadge>);

    expect(container.textContent).toBe('');
    expect(atributosComTexto(container)).toEqual([]);
  });

  it('filhos em zero — mostra o 0', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">{0}</StatusBadge>);

    expect(container.textContent).toBe('0');
  });

  it('filhos em elemento — renderiza o elemento dentro do selo', async () => {
    const { container } = await montar(
      <StatusBadge tone="royal">
        <em>{TEXTO_DO_CONSUMIDOR}</em>
      </StatusBadge>,
    );

    expect(elemento(selo(container), 'em').textContent).toBe(TEXTO_DO_CONSUMIDOR);
  });
});

describe('StatusBadge — contagem', () => {
  it('sem count — não desenha o número', async () => {
    const { container } = await montar(<StatusBadge>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(container.querySelector('[data-numeric]')).toBeNull();
  });

  it('com count — mostra o número depois do texto, marcado como numérico', async () => {
    const { container } = await montar(
      <StatusBadge tone="attention" count={7}>
        {TEXTO_DO_CONSUMIDOR}
      </StatusBadge>,
    );

    expect(container.textContent).toBe(`${TEXTO_DO_CONSUMIDOR}7`);
    expect(elemento(container, '[data-numeric]').textContent).toBe('7');
  });

  it('count zero — o zero aparece', async () => {
    const { container } = await montar(<StatusBadge count={0}>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(elemento(container, '[data-numeric]').textContent).toBe('0');
  });

  it('count com filhos — o número acompanha o texto dos filhos', async () => {
    const { container } = await montar(
      <StatusBadge tone="pending" count={3}>
        Para conferir
      </StatusBadge>,
    );

    expect(container.textContent).toBe('Para conferir3');
  });

  it('count grande — aparece sem separador de milhar', async () => {
    const { container } = await montar(<StatusBadge count={12345}>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(elemento(container, '[data-numeric]').textContent).toBe('12345');
  });
});

describe('StatusBadge — style', () => {
  it('style próprio — sobrepõe o fundo do tom', async () => {
    const { container } = await montar(<StatusBadge style={{ background: 'red' }}>{TEXTO_DO_CONSUMIDOR}</StatusBadge>);

    expect(selo(container).style.background).toBe('red');
  });

  it('style próprio — mantém a cor do texto do tom', async () => {
    const { container } = await montar(
      <StatusBadge tone="royal" style={{ marginLeft: '8px' }}>
        {TEXTO_DO_CONSUMIDOR}
      </StatusBadge>,
    );

    const elementoDoSelo = selo(container);
    expect([elementoDoSelo.style.marginLeft, elementoDoSelo.style.color]).toEqual(['8px', 'var(--color-royal-ink)']);
  });
});
