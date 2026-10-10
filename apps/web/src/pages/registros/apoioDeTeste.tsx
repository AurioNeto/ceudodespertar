import { act } from 'react';
import { vi } from 'vitest';
import { elemento, todos } from '@/testes/montagem';

export type Densidade = 'office' | 'field';

export function usarDensidade(densidade: Densidade) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

export const valorDeSaida = (valor: string) => `R$− ${valor}`;
export const valorDeEntrada = (valor: string) => `R$+ ${valor}`;
export const valorDeTransferencia = (valor: string) => `R$${valor}`;

export const campoRotulado = <T extends HTMLElement>(container: HTMLElement, rotulo: string): T => {
  const etiqueta = todos<HTMLLabelElement>(container, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta) throw new Error(`rótulo não encontrado: ${rotulo}`);
  const campo = container.ownerDocument.getElementById(etiqueta.htmlFor);
  if (!campo) throw new Error(`campo do rótulo não encontrado: ${rotulo}`);
  return campo as T;
};

export const lerRecibos = (origem: HTMLElement) =>
  todos(origem, 'dl').map((lista) => {
    const cartao = lista.parentElement as HTMLElement;
    return {
      titulo: cartao.children[1]?.textContent,
      valor: cartao.querySelector('[data-numeric]')?.textContent ?? null,
      linhas: todos(lista, ':scope > div').map((linha) => [linha.children[0]?.textContent, linha.children[1]?.textContent]),
      rodape: lista.nextElementSibling?.textContent ?? null,
    };
  });

export const barraDeEstado = (linha: HTMLElement) => elemento<HTMLElement>(linha, ':scope > span');

export const teclarEsc = (alvo: HTMLElement) =>
  act(async () => {
    alvo.focus();
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
