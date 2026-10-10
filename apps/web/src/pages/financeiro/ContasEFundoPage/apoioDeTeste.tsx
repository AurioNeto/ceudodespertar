import { vi } from 'vitest';
import { todos } from '@/testes/montagem';

export function fixarDensidade(campo: boolean): void {
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    media: consulta,
    matches: campo,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

export const textosDasFolhas = (raiz: Element): string[] =>
  todos(raiz, '*')
    .filter((elemento) => elemento.childElementCount === 0 && elemento.textContent !== '')
    .map((elemento) => elemento.textContent ?? '');

const PREFIXO_DA_CLASSE_DO_GLIFO = 'lucide-';

export const glifoDe = (icone: Element): string | undefined =>
  Array.from(icone.classList)
    .find((classe) => classe.startsWith(PREFIXO_DA_CLASSE_DO_GLIFO))
    ?.slice(PREFIXO_DA_CLASSE_DO_GLIFO.length);

export function ancestralComTexto(origem: Element, texto: string): HTMLElement {
  let atual = origem.parentElement;
  while (atual && !atual.textContent?.includes(texto)) atual = atual.parentElement;
  if (!atual) throw new Error(`nenhum ancestral com o texto "${texto}"`);
  return atual;
}

export function campoRotulado<T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement>(
  origem: ParentNode,
  rotulo: string,
): T {
  const rotulado = todos<HTMLLabelElement>(origem, 'label').find((candidato) => candidato.textContent?.startsWith(rotulo));
  const campo = rotulado?.querySelector<T>('input, select');
  if (!campo) throw new Error(`campo não encontrado: ${rotulo}`);
  return campo;
}
