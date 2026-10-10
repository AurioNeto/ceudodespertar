import { afterEach, describe, expect, it, vi } from 'vitest';
import { botaoComTexto, clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { ActionBar } from './ActionBar';

afterEach(desmontarTudo);

const barra = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const linhaDeBotoes = (container: HTMLElement) => barra(container).lastElementChild as HTMLElement;

describe('ActionBar: conteúdo', () => {
  it('os filhos ficam todos na linha de baixo, na ordem recebida', async () => {
    const { container } = await montar(
      <ActionBar>
        <button type="button">Cancelar</button>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    const rotulos = todos(linhaDeBotoes(container), 'button').map((botao) => botao.textContent);
    expect(rotulos).toEqual(['Cancelar', 'Salvar']);
  });

  it('o clique chega ao botão filho', async () => {
    const aoSalvar = vi.fn();
    const { container } = await montar(
      <ActionBar>
        <button type="button" onClick={aoSalvar}>
          Salvar
        </button>
      </ActionBar>,
    );
    await clicar(botaoComTexto(container, 'Salvar'));
    expect(aoSalvar).toHaveBeenCalledOnce();
  });

  it('a nota aparece centralizada acima dos botões', async () => {
    const { container } = await montar(
      <ActionBar note="Nada é enviado antes de confirmar.">
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    const nota = elemento(container, 'p');
    expect(nota.textContent).toBe('Nada é enviado antes de confirmar.');
    expect(nota.style.textAlign).toBe('center');
    expect(nota.nextElementSibling).toBe(linhaDeBotoes(container));
  });

  it('sem nota a barra só tem a linha de botões', async () => {
    const { container } = await montar(
      <ActionBar>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).children).toHaveLength(1);
  });

  it('nota vazia não ocupa lugar', async () => {
    const { container } = await montar(
      <ActionBar note="">
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).children).toHaveLength(1);
  });

  it('os botões se alinham ao topo, para o motivo de bloqueio crescer sem esticar os vizinhos', async () => {
    const { container } = await montar(
      <ActionBar>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(linhaDeBotoes(container).style.alignItems).toBe('flex-start');
  });
});

describe('ActionBar: fixação na base', () => {
  it('por padrão gruda na base da área rolável, com sombra para cima', async () => {
    const { container } = await montar(
      <ActionBar>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).style.position).toBe('sticky');
    expect(barra(container).style.bottom).toBe('0px');
    expect(barra(container).style.boxShadow).toBe('0 -6px 18px -14px rgba(59,38,23,.4)');
  });

  it('com sticky falso fica no fluxo normal e sem sombra', async () => {
    const { container } = await montar(
      <ActionBar sticky={false}>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).style.position).toBe('static');
    expect(barra(container).style.boxShadow).toBe('none');
  });

  it('com sticky verdadeiro explícito se comporta como o padrão', async () => {
    const { container } = await montar(
      <ActionBar sticky>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).style.position).toBe('sticky');
  });

  it('o style recebido vence o padrão e preserva o resto', async () => {
    const { container } = await montar(
      <ActionBar style={{ gap: 2 }}>
        <button type="button">Salvar</button>
      </ActionBar>,
    );
    expect(barra(container).style.gap).toBe('2px');
    expect(barra(container).style.position).toBe('sticky');
  });
});
