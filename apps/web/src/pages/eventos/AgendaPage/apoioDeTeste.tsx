import { act } from 'react';
import { vi } from 'vitest';
import { elemento, todos } from '@/testes/montagem';
import type { DetalheDoTrabalhoProps } from './components/DetalheDoTrabalho';

export type DensidadeDeTeste = 'office' | 'field';

export const AGORA_FIXO = new Date('2026-09-11T12:00:00.731Z');
export const ID_DO_TRABALHO_CRIADO_NO_AGORA_FIXO = '1789128000731';

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

export async function digitarEmTextarea(campo: HTMLTextAreaElement, valor: string): Promise<void> {
  const definirValor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  await act(async () => {
    definirValor?.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export const celulasDoCalendario = (origem: ParentNode) =>
  todos<HTMLDivElement>(origem, 'div[style*="min-height: 96px"]');

export const diaDaCelula = (celula: Element): string => celula.querySelector('span')?.textContent ?? '';

export const diasDaGrade = (origem: ParentNode): string[] => celulasDoCalendario(origem).map(diaDaCelula);

export function nomesPorDiaNoCalendario(origem: ParentNode): Record<string, string[]> {
  const porDia: Record<string, string[]> = {};
  for (const celula of celulasDoCalendario(origem)) {
    const chips = todos<HTMLButtonElement>(celula, 'button').map((chip) => chip.textContent ?? '');
    if (chips.length > 0) porDia[diaDaCelula(celula)] = chips;
  }
  return porDia;
}

const FUNDO_DO_DIA_DE_HOJE = 'var(--color-royal)';

export const diasDestacadosComoHoje = (origem: ParentNode): string[] =>
  celulasDoCalendario(origem)
    .map((celula) => celula.querySelector('span'))
    .filter((numero): numero is HTMLSpanElement => numero !== null && numero.style.background === FUNDO_DO_DIA_DE_HOJE)
    .map((numero) => numero.textContent ?? '');

export const chipsDoCalendario = (origem: ParentNode) =>
  celulasDoCalendario(origem).flatMap((celula) => todos<HTMLButtonElement>(celula, 'button'));

export const chipDoCalendario = (origem: ParentNode, nome: string): HTMLButtonElement => {
  const achado = chipsDoCalendario(origem).find((chip) => chip.textContent === nome);
  if (!achado) throw new Error(`chip não encontrado: ${nome}`);
  return achado;
};

export const botaoPeloRotuloAcessivel = (origem: ParentNode, rotulo: string) =>
  elemento<HTMLButtonElement>(origem, `button[aria-label="${rotulo}"]`);

export const formularioAberto = (origem: ParentNode) => elemento<HTMLDivElement>(origem, 'div[style*="position: fixed"]');

export const textoDoNumero = (origem: ParentNode, rotulo: string): string => {
  const etiqueta = todos<HTMLSpanElement>(origem, 'span').find(
    (candidata) => candidata.childElementCount === 0 && candidata.textContent === rotulo,
  );
  if (!etiqueta?.parentElement) throw new Error(`número não encontrado: ${rotulo}`);
  return etiqueta.parentElement.textContent ?? '';
};

export const clicarVezes = (alvo: HTMLElement, vezes: number): Promise<void> =>
  Array.from({ length: vezes }).reduce<Promise<void>>(
    (anterior) =>
      anterior.then(() =>
        act(async () => {
          alvo.click();
        }),
      ),
    Promise.resolve(),
  );

type TrabalhoDeTeste = DetalheDoTrabalhoProps['trabalho'];

export const umTrabalho = (sobrescritas: Partial<TrabalhoDeTeste> = {}): TrabalhoDeTeste => ({
  id: 7,
  nome: 'Trabalho de teste',
  tipo: 'Concentração',
  ano: 2026,
  mes: 9,
  dia: 5,
  horario: '20:00 às 04:00',
  local: 'Salão principal',
  dirigente: 'Aurio Neto',
  previstos: 40,
  confirmados: 0,
  visitantes: 0,
  litros: 0,
  contribuicoes: [],
  situacao: 'planejada',
  equipe: [],
  preparo: [],
  previstoGasto: 0,
  realizadoGasto: 0,
  arrecadado: 0,
  observacoes: '',
  ...sobrescritas,
});
