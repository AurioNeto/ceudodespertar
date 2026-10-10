import { afterEach, describe, expect, it } from 'vitest';
import { FlowerOfLife } from './FlowerOfLife';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const circulosDe = (container: HTMLElement) => Array.from(container.querySelectorAll('circle'));

const CENTROS_DA_FLOR: readonly [string, string][] = [
  ['100', '100'],
  ['100', '66'],
  ['100', '134'],
  ['129', '83'],
  ['129', '117'],
  ['71', '83'],
  ['71', '117'],
];

describe('FlowerOfLife', () => {
  it('desenha um svg decorativo de 200x200', async () => {
    const { container } = await montar(<FlowerOfLife />);

    const figura = elemento<SVGElement>(container, 'svg');
    expect([figura.getAttribute('aria-hidden'), figura.getAttribute('viewBox')]).toEqual(['true', '0 0 200 200']);
  });

  it('desenha sete círculos nos centros da flor', async () => {
    const { container } = await montar(<FlowerOfLife />);

    expect(circulosDe(container).map((circulo) => [circulo.getAttribute('cx'), circulo.getAttribute('cy')])).toEqual(
      CENTROS_DA_FLOR,
    );
  });

  it('todos os círculos têm raio 34', async () => {
    const { container } = await montar(<FlowerOfLife />);

    expect(circulosDe(container).map((circulo) => circulo.getAttribute('r'))).toEqual(
      CENTROS_DA_FLOR.map(() => '34'),
    );
  });

  it('é uma marca d\'água: cobre o pai e fica quase transparente', async () => {
    const { container } = await montar(<FlowerOfLife />);

    const figura = elemento<SVGElement>(container, 'svg');
    expect([figura.style.position, figura.style.opacity]).toEqual(['absolute', '0.06']);
  });
});
