import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clicar, desmontarTudo, elemento, montar, todos } from '@/testes/montagem';
import { glifoDe } from '../../apoioDeTeste';
import { SuggestionChip } from './SuggestionChip';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  await desmontarTudo();
  vi.useRealTimers();
});

const chip = (container: HTMLElement) => container.firstElementChild as HTMLElement;
const botaoAceitar = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[title="Aceitar sugestão"]');
const botaoDescartar = (container: HTMLElement) => elemento<HTMLButtonElement>(container, 'button[title="Descartar sugestão"]');

describe('SuggestionChip: conteúdo', () => {
  it('mostra o texto da sugestão', async () => {
    const { container } = await montar(<SuggestionChip>Categoria: Material de limpeza</SuggestionChip>);
    expect(chip(container).textContent).toBe('Categoria: Material de limpeza');
  });

  it('o ícone de faíscas que marca a sugestão é decorativo', async () => {
    const { container } = await montar(<SuggestionChip>Categoria: Material de limpeza</SuggestionChip>);
    const icone = elemento(container, 'svg');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(chip(container).firstElementChild).toBe(icone);
    expect(glifoDe(icone)).toBe('sparkles');
  });

  it('aceita elemento React como conteúdo', async () => {
    const { container } = await montar(
      <SuggestionChip>
        <em>Cora PJ</em>
      </SuggestionChip>,
    );
    expect(elemento(container, 'em').textContent).toBe('Cora PJ');
  });
});

describe('SuggestionChip: aceitar e descartar', () => {
  it('sem nenhum tratador a sugestão é só leitura: não há botões', async () => {
    const { container } = await montar(<SuggestionChip>Categoria: Material de limpeza</SuggestionChip>);
    expect(todos(container, 'button')).toHaveLength(0);
  });

  it('só com onAccept aparece só o botão de aceitar', async () => {
    const { container } = await montar(<SuggestionChip onAccept={vi.fn()}>Cora PJ</SuggestionChip>);
    expect(todos(container, 'button').map((botao) => botao.title)).toEqual(['Aceitar sugestão']);
  });

  it('só com onDismiss aparece só o botão de descartar', async () => {
    const { container } = await montar(<SuggestionChip onDismiss={vi.fn()}>Cora PJ</SuggestionChip>);
    expect(todos(container, 'button').map((botao) => botao.title)).toEqual(['Descartar sugestão']);
  });

  it('com os dois tratadores os botões vêm na ordem aceitar, descartar', async () => {
    const { container } = await montar(
      <SuggestionChip onAccept={vi.fn()} onDismiss={vi.fn()}>
        Cora PJ
      </SuggestionChip>,
    );
    expect(todos(container, 'button').map((botao) => botao.title)).toEqual(['Aceitar sugestão', 'Descartar sugestão']);
  });

  it('o botão de aceitar tem só o ícone de check, decorativo', async () => {
    const { container } = await montar(<SuggestionChip onAccept={vi.fn()}>Cora PJ</SuggestionChip>);
    const icone = elemento(botaoAceitar(container), 'svg');
    expect(glifoDe(icone)).toBe('check');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(botaoAceitar(container).textContent).toBe('');
  });

  it('o botão de descartar tem só o ícone de x, decorativo', async () => {
    const { container } = await montar(<SuggestionChip onDismiss={vi.fn()}>Cora PJ</SuggestionChip>);
    const icone = elemento(botaoDescartar(container), 'svg');
    expect(glifoDe(icone)).toBe('x');
    expect(icone.getAttribute('aria-hidden')).toBe('true');
    expect(botaoDescartar(container).textContent).toBe('');
  });

  it('os botões são de tipo button e dentro de um formulário não o enviam', async () => {
    const aoEnviar = vi.fn();
    const { container } = await montar(
      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          aoEnviar();
        }}
      >
        <SuggestionChip onAccept={vi.fn()} onDismiss={vi.fn()}>
          Cora PJ
        </SuggestionChip>
      </form>,
    );
    await clicar(botaoAceitar(container));
    await clicar(botaoDescartar(container));
    expect(aoEnviar).not.toHaveBeenCalled();
  });

  it('aceitar chama só onAccept, uma vez', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    const { container } = await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await clicar(botaoAceitar(container));
    expect(aoAceitar).toHaveBeenCalledOnce();
    expect(aoDescartar).not.toHaveBeenCalled();
  });

  it('descartar chama só onDismiss, uma vez', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    const { container } = await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await clicar(botaoDescartar(container));
    expect(aoDescartar).toHaveBeenCalledOnce();
    expect(aoAceitar).not.toHaveBeenCalled();
  });

  it('clicar no texto da sugestão não aceita nem descarta', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    const { container } = await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await clicar(chip(container));
    await clicar(elemento(container, 'span > span'));
    expect(aoAceitar).not.toHaveBeenCalled();
    expect(aoDescartar).not.toHaveBeenCalled();
  });

  it('os botões não têm texto: o nome vem do title', async () => {
    const { container } = await montar(
      <SuggestionChip onAccept={vi.fn()} onDismiss={vi.fn()}>
        Cora PJ
      </SuggestionChip>,
    );
    expect(todos(container, 'button').map((botao) => botao.textContent)).toEqual(['', '']);
  });
});

describe('SuggestionChip: nunca aplica sozinha', () => {
  it('montar não aceita nem descarta, nem depois de muito tempo parada na tela', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(aoAceitar).not.toHaveBeenCalled();
    expect(aoDescartar).not.toHaveBeenCalled();
  });

  it('remontar com outro texto não aceita nem descarta', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    const montado = await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await montado.atualizar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Caixa físico
      </SuggestionChip>,
    );
    expect(chip(montado.container).textContent).toBe('Caixa físico');
    expect(aoAceitar).not.toHaveBeenCalled();
    expect(aoDescartar).not.toHaveBeenCalled();
  });

  it('dar foco aos botões não aceita nem descarta', async () => {
    const aoAceitar = vi.fn();
    const aoDescartar = vi.fn();
    const { container } = await montar(
      <SuggestionChip onAccept={aoAceitar} onDismiss={aoDescartar}>
        Cora PJ
      </SuggestionChip>,
    );
    await act(async () => {
      botaoAceitar(container).focus();
      botaoDescartar(container).focus();
    });
    expect(aoAceitar).not.toHaveBeenCalled();
    expect(aoDescartar).not.toHaveBeenCalled();
  });
});

describe('SuggestionChip: densidade', () => {
  it.each([
    { nome: 'sem densidade, vale a de campo', densidade: undefined, altura: 'var(--target-field)', respiro: '0px 6px 0px 14px' },
    { nome: 'campo', densidade: 'field', altura: 'var(--target-field)', respiro: '0px 6px 0px 14px' },
    { nome: 'escritório', densidade: 'office', altura: 'var(--target-office)', respiro: '0px 4px 0px 12px' },
  ] as const)('$nome: altura mínima $altura e respiro $respiro', async ({ densidade, altura, respiro }) => {
    const { container } = await montar(
      densidade ? <SuggestionChip density={densidade}>Cora PJ</SuggestionChip> : <SuggestionChip>Cora PJ</SuggestionChip>,
    );
    expect(chip(container).style.minHeight).toBe(altura);
    expect(chip(container).style.padding).toBe(respiro);
  });

  it('os botões mantêm o alvo mínimo de toque nas duas densidades', async () => {
    const campo = await montar(
      <SuggestionChip density="field" onAccept={vi.fn()} onDismiss={vi.fn()}>
        Cora PJ
      </SuggestionChip>,
    );
    const escritorio = await montar(
      <SuggestionChip density="office" onAccept={vi.fn()} onDismiss={vi.fn()}>
        Cora PJ
      </SuggestionChip>,
    );
    const alvos = [...todos(campo.container, 'button'), ...todos(escritorio.container, 'button')].map((botao) => botao.style.minHeight);
    expect(alvos).toEqual(['var(--tap-min)', 'var(--tap-min)', 'var(--tap-min)', 'var(--tap-min)']);
  });

  it('o style recebido vence o padrão e preserva o resto', async () => {
    const { container } = await montar(<SuggestionChip style={{ gap: 2 }}>Cora PJ</SuggestionChip>);
    expect(chip(container).style.gap).toBe('2px');
    expect(chip(container).style.display).toBe('inline-flex');
  });
});
