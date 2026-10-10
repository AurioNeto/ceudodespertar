import { act } from 'react';
import { vi } from 'vitest';
import { todos } from '@/testes/montagem';

export type Densidade = 'office' | 'field';

export function usarDensidade(densidade: Densidade) {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

export const SINAL_DE_SAIDA = '− ';
export const SINAL_DE_ENTRADA = '+ ';

export const campoComRotulo = (origem: ParentNode, rotulo: string): HTMLInputElement => {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((candidata) => candidata.textContent === rotulo);
  const campo = etiqueta?.querySelector('input');
  if (!campo) throw new Error(`campo não encontrado: ${rotulo}`);
  return campo;
};

export const rotulosDosCampos = (origem: ParentNode) =>
  todos<HTMLLabelElement>(origem, 'label')
    .filter((etiqueta) => etiqueta.querySelector('input') !== null)
    .map((etiqueta) => etiqueta.textContent);

export async function digitarNaCaixa(caixa: HTMLTextAreaElement, valor: string): Promise<void> {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(caixa, valor);
    caixa.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export const teclarEsc = (alvo: HTMLElement) =>
  act(async () => {
    alvo.focus();
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  });
