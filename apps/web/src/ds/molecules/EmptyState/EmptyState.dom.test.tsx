import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { clicar, desmontarTudo, elemento, montar } from '@/testes/montagem';

afterEach(desmontarTudo);

const raizDe = (container: HTMLElement) => elemento<HTMLDivElement>(container, ':scope > div');
const paragrafosDe = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p')).map((paragrafo) => paragrafo.textContent);
const circulosDe = (container: HTMLElement) => Array.from(container.querySelectorAll('circle'));

describe('EmptyState', () => {
  it('só o título — mostra o título em h3 e a flor da vida', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" />);

    expect(elemento(container, 'h3').textContent).toBe('Nada por aqui');
    expect(circulosDe(container).length).toBe(7);
  });

  it('só o título — não desenha descrição nem ação', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" />);

    expect(container.textContent).toBe('Nada por aqui');
    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com descrição — mostra o parágrafo depois do título', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" description="Registre o primeiro lançamento." />);

    expect(paragrafosDe(container)).toEqual(['Registre o primeiro lançamento.']);
    expect(container.textContent).toBe('Nada por aquiRegistre o primeiro lançamento.');
  });

  it('descrição vazia — não desenha parágrafo', async () => {
    const { container } = await montar(<EmptyState title="Nada por aqui" description="" />);

    expect(paragrafosDe(container)).toEqual([]);
  });

  it('com ação — renderiza a ação por último', async () => {
    const { container } = await montar(
      <EmptyState title="Nada por aqui" description="D" action={<button type="button">Novo lançamento</button>} />,
    );

    expect(container.textContent).toBe('Nada por aquiDNovo lançamento');
    expect(elemento(container, 'button').textContent).toBe('Novo lançamento');
  });

  it.each([['string vazia', ''], ['zero', 0], ['falso', false], ['nula', null]])('ação %s — não desenha o contêiner da ação', async (_nome, action) => {
    const { container: semAcao } = await montar(<EmptyState title="Nada por aqui" />);
    const { container } = await montar(<EmptyState title="Nada por aqui" action={action} />);

    expect(raizDe(container).children.length).toBe(raizDe(semAcao).children.length);
    expect(container.textContent).toBe('Nada por aqui');
  });

  it('a ação continua clicável', async () => {
    const aoClicar = vi.fn();
    const { container } = await montar(
      <EmptyState title="Nada por aqui" action={<button type="button" onClick={aoClicar}>Novo</button>} />,
    );

    await clicar(elemento<HTMLButtonElement>(container, 'button'));

    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('style próprio — sobrepõe o fundo', async () => {
    const { container } = await montar(<EmptyState title="T" style={{ background: 'red' }} />);

    expect(raizDe(container).style.background).toBe('red');
  });
});
