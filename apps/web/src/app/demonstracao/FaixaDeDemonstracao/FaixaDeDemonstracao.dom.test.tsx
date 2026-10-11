import { afterEach, describe, expect, it } from 'vitest';
import { FaixaDeDemonstracao, TEXTO_DA_FAIXA_DE_DEMONSTRACAO } from './FaixaDeDemonstracao';
import { desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const faixaDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, '[role="note"]');

describe('FaixaDeDemonstracao', () => {
  it('renderiza uma nota com o texto exportado', async () => {
    const { container } = await montar(<FaixaDeDemonstracao />);

    expect(faixaDe(container).textContent).toBe(TEXTO_DA_FAIXA_DE_DEMONSTRACAO);
  });

  it('renderiza uma única nota, sem outros elementos', async () => {
    const { container } = await montar(<FaixaDeDemonstracao />);

    expect(container.children.length).toBe(1);
    expect(container.querySelectorAll('[role="note"]').length).toBe(1);
  });

  it('o ícone circle-alert é decorativo', async () => {
    const { container } = await montar(<FaixaDeDemonstracao />);

    const icone = elemento<SVGElement>(faixaDe(container), 'svg');
    expect([icone.classList.contains('lucide-circle-alert'), icone.getAttribute('aria-hidden')]).toEqual([true, 'true']);
  });

  it('o ícone vem antes do texto, com 16px', async () => {
    const { container } = await montar(<FaixaDeDemonstracao />);

    const faixa = faixaDe(container);
    expect(faixa.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect([faixa.firstElementChild?.getAttribute('width'), faixa.firstElementChild?.getAttribute('height')]).toEqual([
      '16',
      '16',
    ]);
  });

  it('fica colada no topo ao rolar a tela', async () => {
    const { container } = await montar(<FaixaDeDemonstracao />);

    const faixa = faixaDe(container);
    expect([faixa.style.position, faixa.style.top]).toEqual(['sticky', '0px']);
  });
});
