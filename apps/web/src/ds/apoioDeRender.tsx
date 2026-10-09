import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export interface Montado {
  readonly container: HTMLElement;
  texto(): string;
  atualizar(arvore: ReactElement): Promise<void>;
  desmontar(): Promise<void>;
}

const montados: Montado[] = [];

export async function montar(arvore: ReactElement): Promise<Montado> {
  const container = document.createElement('div');
  document.body.append(container);
  const raiz = createRoot(container);
  await act(async () => {
    raiz.render(arvore);
  });
  const montado: Montado = {
    container,
    texto: () => container.textContent ?? '',
    async atualizar(proxima) {
      await act(async () => {
        raiz.render(proxima);
      });
    },
    async desmontar() {
      await act(async () => {
        raiz.unmount();
      });
      container.remove();
    },
  };
  montados.push(montado);
  return montado;
}

export async function desmontarTudo(): Promise<void> {
  while (montados.length > 0) await montados.pop()?.desmontar();
}

export function elemento<T extends Element>(origem: ParentNode, seletor: string): T {
  const achado = origem.querySelector<T>(seletor);
  if (!achado) throw new Error(`elemento não encontrado: ${seletor}`);
  return achado;
}

export function folhaComTexto<T extends Element>(origem: ParentNode, seletor: string, texto: string): T {
  const ehFolhaComOTexto = (candidato: T) => candidato.childElementCount === 0 && candidato.textContent === texto;
  const achado = Array.from(origem.querySelectorAll<T>(seletor)).find(ehFolhaComOTexto);
  if (!achado) throw new Error(`elemento não encontrado: ${seletor} com o texto "${texto}"`);
  return achado;
}

export async function clicar(alvo: HTMLElement): Promise<void> {
  await act(async () => {
    alvo.click();
  });
}

export async function digitar(campo: HTMLInputElement, valor: string): Promise<void> {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export async function passarMouseSobre(alvo: HTMLElement): Promise<void> {
  await act(async () => {
    alvo.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null }));
  });
}

export async function tirarMouseDe(alvo: HTMLElement): Promise<void> {
  await act(async () => {
    alvo.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: null }));
  });
}
