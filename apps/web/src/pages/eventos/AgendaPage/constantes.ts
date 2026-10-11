import type { TipoDeTrabalho } from './tipos';

/** Cor por tipo de trabalho — a mesma no chip do calendário e na legenda. */
export const CORES_POR_TIPO: Record<TipoDeTrabalho, string> = {
  Concentração: 'oklch(0.52 0.13 265)',
  'Trabalho de cura': 'oklch(0.64 0.12 155)',
  Feitio: 'oklch(0.72 0.13 90)',
  Bailado: 'oklch(0.58 0.15 25)',
  'Reunião do corpo': 'oklch(0.62 0.11 205)',
};
