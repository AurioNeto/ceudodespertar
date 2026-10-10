import { vi } from 'vitest';
import { elemento, todos } from '@/testes/montagem';

export type DensidadeDeTeste = 'office' | 'field';

export function definirDensidade(densidade: DensidadeDeTeste): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: densidade === 'field',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

export function textoDoAviso(origem: ParentNode): string | null {
  const fechar = origem.querySelector('button[aria-label="fechar aviso"]');
  return fechar?.previousElementSibling?.textContent ?? null;
}

export function campoRotulado<T extends HTMLElement = HTMLInputElement>(origem: ParentNode, rotulo: string): T {
  const etiqueta = todos<HTMLLabelElement>(origem, 'label').find((candidata) => candidata.textContent === rotulo);
  if (!etiqueta?.control) throw new Error(`campo não encontrado: ${rotulo}`);
  return etiqueta.control as T;
}

export const cabecalhoDaTela = (origem: ParentNode) => elemento(origem, 'header');
