import { afterEach, describe, expect, it } from 'vitest';
import { SkeletonList } from './SkeletonList';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');

const cartoesDe = (container: HTMLElement) => Array.from(container.querySelectorAll(':scope > div > div'));
const largurasDasBarras = (cartao: Element) =>
  Array.from(cartao.children).map((barra) => (barra as HTMLElement).style.width);

const QUANTIDADE_DE_LINHAS: readonly number[] = [0, 1, 3, 4, 5, 9];

const LARGURAS_POR_LINHA: readonly [number, string, string][] = [
  [0, '58%', '32%'],
  [1, '44%', '26%'],
  [2, '66%', '30%'],
  [3, '38%', '22%'],
  [4, '58%', '32%'],
  [7, '38%', '22%'],
];

describe('SkeletonList', () => {
  it('sem rows — desenha 4 cartões', async () => {
    const { container } = await montar(<SkeletonList />);

    expect(cartoesDe(container).length).toBe(4);
  });

  it.each(QUANTIDADE_DE_LINHAS)('rows %s — desenha essa quantidade de cartões', async (linhas) => {
    const { container } = await montar(<SkeletonList rows={linhas} />);

    expect(cartoesDe(container).length).toBe(linhas);
  });

  it('rows negativo — não desenha cartões', async () => {
    const { container } = await montar(<SkeletonList rows={-2} />);

    expect(cartoesDe(container).length).toBe(0);
  });

  it('cada cartão — tem duas barras, a de título mais alta que a de meta', async () => {
    const { container } = await montar(<SkeletonList rows={1} />);

    const barras = Array.from(elemento(container, ':scope > div > div').children) as HTMLElement[];
    expect(barras.map((barra) => barra.style.height)).toEqual(['11px', '9px']);
  });

  it.each(LARGURAS_POR_LINHA)('linha %s — barras de %s e %s, repetindo o ciclo de quatro', async (indice, titulo, meta) => {
    const { container } = await montar(<SkeletonList rows={8} />);

    expect(largurasDasBarras(cartoesDe(container)[indice] as Element)).toEqual([titulo, meta]);
  });

  it('declara os keyframes cdd-sh e a barra os usa na animação', async () => {
    const { container } = await montar(<SkeletonList rows={1} />);

    const barra = elemento<HTMLElement>(container, ':scope > div > div > div');
    expect(elemento(container, 'style').textContent).toContain('@keyframes cdd-sh');
    expect(barra.style.animation).toBe('cdd-sh 1.3s ease infinite');
  });

  it('não escreve texto visível — o único texto é a declaração da animação', async () => {
    const { container } = await montar(<SkeletonList rows={3} />);

    expect(container.textContent).toBe('@keyframes cdd-sh{0%{background-position:100% 0}100%{background-position:0 0}}');
  });

  it('style próprio — sobrepõe o espaçamento entre cartões', async () => {
    const { container } = await montar(<SkeletonList style={{ gap: '30px' }} />);

    expect(raizDe(container).style.gap).toBe('30px');
  });
});
