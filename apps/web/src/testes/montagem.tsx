import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export interface Montado {
  readonly container: HTMLElement;
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

export function elemento<T extends Element = HTMLElement>(origem: ParentNode, seletor: string): T {
  const achado = origem.querySelector<T>(seletor);
  if (!achado) throw new Error(`elemento não encontrado: ${seletor}`);
  return achado;
}

export const todos = <T extends Element = HTMLElement>(origem: ParentNode, seletor: string): T[] =>
  Array.from(origem.querySelectorAll<T>(seletor));

export function folhaComTexto<T extends Element>(origem: ParentNode, seletor: string, texto: string): T {
  const ehFolhaComOTexto = (candidato: T) => candidato.childElementCount === 0 && candidato.textContent === texto;
  const achado = todos<T>(origem, seletor).find(ehFolhaComOTexto);
  if (!achado) throw new Error(`elemento não encontrado: ${seletor} com o texto "${texto}"`);
  return achado;
}

export function botaoComTexto(origem: ParentNode, texto: string): HTMLButtonElement {
  const achado = todos<HTMLButtonElement>(origem, 'button').find((botao) => botao.textContent?.trim() === texto);
  if (!achado) throw new Error(`botão não encontrado: ${texto}`);
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

export async function escolherOpcao(campo: HTMLSelectElement, valor: string): Promise<void> {
  await act(async () => {
    campo.value = valor;
    campo.dispatchEvent(new Event('change', { bubbles: true }));
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
