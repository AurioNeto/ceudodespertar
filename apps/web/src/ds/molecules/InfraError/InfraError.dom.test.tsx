import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfraError } from './InfraError';
import { clicar, desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const paragrafosDe = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p')).map((paragrafo) => paragrafo.textContent);

describe('InfraError', () => {
  it('sem título — usa "Não deu para carregar" e mostra a descrição', async () => {
    const { container } = await montar(<InfraError description="Sem conexão com o servidor." />);

    expect(container.textContent).toBe('Não deu para carregarSem conexão com o servidor.');
  });

  it('título próprio — substitui o padrão', async () => {
    const { container } = await montar(<InfraError title="Falha ao salvar" description="Tente mais tarde." />);

    expect(container.textContent).toBe('Falha ao salvarTente mais tarde.');
  });

  it('descrição — sai em parágrafo', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." />);

    expect(paragrafosDe(container)).toEqual(['Sem conexão.']);
  });

  it('sem onRetry — não oferece nova tentativa', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." />);

    expect(container.querySelector('button')).toBeNull();
  });

  it('com onRetry — oferece o botão "Tentar de novo"', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={vi.fn()} />);

    expect(elemento(container, 'button').textContent).toBe('Tentar de novo');
  });

  it('com onRetry — o clique no botão chama onRetry uma vez', async () => {
    const aoTentarDeNovo = vi.fn();
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={aoTentarDeNovo} />);

    await clicar(elemento<HTMLButtonElement>(container, 'button'));

    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('sinaliza a falta de conexão com o ícone wifi-off, e o botão leva rotate-cw', async () => {
    const { container } = await montar(<InfraError description="Sem conexão." onRetry={vi.fn()} />);

    const icones = Array.from(container.querySelectorAll('svg'));
    expect(icones.map((icone) => [icone.classList.contains('lucide-wifi-off'), icone.classList.contains('lucide-rotate-cw')])).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<InfraError description="D" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});
