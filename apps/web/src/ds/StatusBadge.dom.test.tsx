import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge, type BadgeTone } from './StatusBadge';
import { desmontarTudo, elemento, montar } from '../testes/montagem';

afterEach(desmontarTudo);

const selo = (container: HTMLElement) => elemento<HTMLSpanElement>(container, ':scope > span');

const ROTULO_E_CORES_POR_TOM: readonly [BadgeTone, string, string, string][] = [
  ['pending', 'A conferir', 'var(--color-pending-soft)', 'var(--color-pending)'],
  ['confirmed', 'Confirmado', 'var(--color-confirmed-soft)', 'var(--color-confirmed)'],
  ['attention', 'Aguardando resposta', 'var(--color-attention-soft)', 'var(--color-attention)'],
  ['neutral', 'Estornado', 'var(--color-neutral-soft)', 'var(--color-neutral)'],
  ['suggest', 'Sugestão', 'var(--color-suggest-soft)', 'var(--color-suggest)'],
  ['royal', 'Conciliado', 'var(--color-royal-soft)', 'var(--color-royal-ink)'],
];

describe('StatusBadge — tom e rótulo', () => {
  it('sem tom — usa o pendente e mostra "A conferir"', async () => {
    const { container } = await montar(<StatusBadge />);

    expect(container.textContent).toBe('A conferir');
    expect(selo(container).style.color).toBe('var(--color-pending)');
  });

  it.each(ROTULO_E_CORES_POR_TOM)('tom %s — sem filhos mostra o rótulo "%s"', async (tom, rotulo) => {
    const { container } = await montar(<StatusBadge tone={tom} />);

    expect(container.textContent).toBe(rotulo);
  });

  it.each(ROTULO_E_CORES_POR_TOM)('tom %s — aplica fundo suave e cor do texto do tom', async (tom, _rotulo, fundo, cor) => {
    const { container } = await montar(<StatusBadge tone={tom} />);

    const elementoDoSelo = selo(container);
    expect([elementoDoSelo.style.background, elementoDoSelo.style.color]).toEqual([fundo, cor]);
  });

  it('com filhos — o texto dos filhos substitui o rótulo do tom', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">Pago em 12/03</StatusBadge>);

    expect(container.textContent).toBe('Pago em 12/03');
  });

  it('filhos nulos — volta ao rótulo do tom', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">{null}</StatusBadge>);

    expect(container.textContent).toBe('Confirmado');
  });

  it('filhos em string vazia — mostra o selo sem texto, sem cair no rótulo', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">{''}</StatusBadge>);

    expect(container.textContent).toBe('');
  });

  it('filhos em zero — mostra o 0 em vez do rótulo', async () => {
    const { container } = await montar(<StatusBadge tone="confirmed">{0}</StatusBadge>);

    expect(container.textContent).toBe('0');
  });
});

describe('StatusBadge — contagem', () => {
  it('sem count — não desenha o número', async () => {
    const { container } = await montar(<StatusBadge />);

    expect(container.querySelector('[data-numeric]')).toBeNull();
  });

  it('com count — mostra o número depois do rótulo, marcado como numérico', async () => {
    const { container } = await montar(<StatusBadge tone="attention" count={7} />);

    expect(container.textContent).toBe('Aguardando resposta7');
    expect(elemento(container, '[data-numeric]').textContent).toBe('7');
  });

  it('count zero — o zero aparece', async () => {
    const { container } = await montar(<StatusBadge count={0} />);

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
    const { container } = await montar(<StatusBadge count={12345} />);

    expect(elemento(container, '[data-numeric]').textContent).toBe('12345');
  });
});

describe('StatusBadge — style', () => {
  it('style próprio — sobrepõe o fundo do tom', async () => {
    const { container } = await montar(<StatusBadge style={{ background: 'red' }} />);

    expect(selo(container).style.background).toBe('red');
  });

  it('style próprio — mantém a cor do texto do tom', async () => {
    const { container } = await montar(<StatusBadge tone="royal" style={{ marginLeft: '8px' }} />);

    const elementoDoSelo = selo(container);
    expect([elementoDoSelo.style.marginLeft, elementoDoSelo.style.color]).toEqual(['8px', 'var(--color-royal-ink)']);
  });
});
