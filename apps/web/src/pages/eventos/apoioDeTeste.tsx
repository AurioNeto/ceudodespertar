import { vi } from 'vitest';
import { todos } from '@/testes/montagem';

export type DensidadeDeTeste = 'office' | 'field';

export const AGORA_FIXO = new Date('2026-09-11T12:00:00.731Z');

export function fixarDensidade(densidade: DensidadeDeTeste): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

export function campoDoRotulo<T extends HTMLElement = HTMLInputElement>(origem: ParentNode, rotulo: string): T {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta) throw new Error(`rótulo não encontrado: ${rotulo}`);
  const campo = document.getElementById(etiqueta.htmlFor);
  if (!campo) throw new Error(`campo do rótulo não encontrado: ${rotulo}`);
  return campo as T;
}

export const folhaComTextoExato = (origem: ParentNode, texto: string): HTMLSpanElement | undefined =>
  todos<HTMLSpanElement>(origem, 'span').find((span) => span.childElementCount === 0 && span.textContent === texto);

export function textoDaFolhaPai(origem: ParentNode, rotulo: string): string {
  const etiqueta = folhaComTextoExato(origem, rotulo);
  if (!etiqueta?.parentElement) throw new Error(`rótulo não encontrado: ${rotulo}`);
  return etiqueta.parentElement.textContent ?? '';
}

const CARTAO = 'div[style*="border: var(--border-hairline)"]';

export function cartaoDoRotulo(origem: ParentNode, rotulo: string): HTMLElement {
  const etiqueta = folhaComTextoExato(origem, rotulo);
  const cartao = etiqueta?.closest<HTMLElement>(CARTAO);
  if (!cartao) throw new Error(`cartão não encontrado pelo rótulo: ${rotulo}`);
  return cartao;
}

export const itensDaListaDoCartao = (cartao: HTMLElement): string[] =>
  Array.from(cartao.lastElementChild?.children ?? []).map((item) => item.textContent ?? '');

export const recadoDaTela = (origem: ParentNode): string | null =>
  origem.querySelector('[role="status"]')?.textContent?.replace(/×$/, '') ?? null;

export const botaoDoRecado = (origem: ParentNode) => origem.querySelector<HTMLButtonElement>('button[aria-label="fechar recado"]');
