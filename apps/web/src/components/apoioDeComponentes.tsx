import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export interface Montagem {
  readonly container: HTMLElement;
  renderizar(elemento: ReactElement): Promise<void>;
  texto(): string;
}

interface MontagemAberta {
  readonly raiz: Root;
  readonly container: HTMLElement;
}

const abertas: MontagemAberta[] = [];

export async function montar(elemento: ReactElement): Promise<Montagem> {
  const container = document.createElement('div');
  document.body.append(container);
  const raiz = createRoot(container);
  abertas.push({ raiz, container });

  const renderizar = async (proximo: ReactElement) => {
    await act(async () => {
      raiz.render(proximo);
    });
  };
  await renderizar(elemento);

  return { container, renderizar, texto: () => container.textContent ?? '' };
}

export async function desmontarTudo(): Promise<void> {
  for (const { raiz, container } of abertas.splice(0)) {
    await act(async () => {
      raiz.unmount();
    });
    container.remove();
  }
}

export function elemento<T extends Element = HTMLElement>(origem: ParentNode, seletor: string): T {
  const achado = origem.querySelector<T>(seletor);
  if (!achado) throw new Error(`elemento não encontrado: ${seletor}`);
  return achado;
}

export const todos = <T extends Element = HTMLElement>(origem: ParentNode, seletor: string): T[] =>
  Array.from(origem.querySelectorAll<T>(seletor));

export function botaoComTexto(origem: ParentNode, texto: string): HTMLButtonElement {
  const achado = todos<HTMLButtonElement>(origem, 'button').find((b) => b.textContent?.trim() === texto);
  if (!achado) throw new Error(`botão não encontrado: ${texto}`);
  return achado;
}

export const clicar = (alvo: HTMLElement): Promise<void> =>
  act(async () => {
    alvo.click();
  });

export const escolherOpcao = (alvo: HTMLSelectElement, valor: string): Promise<void> =>
  act(async () => {
    alvo.value = valor;
    alvo.dispatchEvent(new Event('change', { bubbles: true }));
  });
