import { CONJUNTO_FINANCEIRO, GRUPOS_FINANCEIROS } from './constantes.js';

export function financeiro(x: string): boolean[] {
  return [GRUPOS_FINANCEIROS.includes(x), CONJUNTO_FINANCEIRO.has(x)];
}
