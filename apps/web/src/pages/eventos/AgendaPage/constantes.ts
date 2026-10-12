import type { TipoDeTrabalho } from './tipos';

export const CORES_POR_TIPO: Record<TipoDeTrabalho, { cheia: string; fundo: string; tinta: string }> = {
  Concentração: { cheia: 'var(--tipo-concentracao)', fundo: 'var(--tipo-concentracao-bg)', tinta: 'var(--tipo-concentracao-fg)' },
  'Trabalho de cura': { cheia: 'var(--tipo-cura)', fundo: 'var(--tipo-cura-bg)', tinta: 'var(--tipo-cura-fg)' },
  Feitio: { cheia: 'var(--tipo-feitio)', fundo: 'var(--tipo-feitio-bg)', tinta: 'var(--tipo-feitio-fg)' },
  Bailado: { cheia: 'var(--tipo-bailado)', fundo: 'var(--tipo-bailado-bg)', tinta: 'var(--tipo-bailado-fg)' },
  'Reunião do corpo': { cheia: 'var(--tipo-reuniao)', fundo: 'var(--tipo-reuniao-bg)', tinta: 'var(--tipo-reuniao-fg)' },
};
