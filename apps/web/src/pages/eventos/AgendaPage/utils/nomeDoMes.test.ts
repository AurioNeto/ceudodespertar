import { describe, expect, it } from 'vitest';
import { nomeDoMes } from './nomeDoMes';

const MESES_POR_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const mesesNumerados = MESES_POR_EXTENSO.map((nome, indice) => [indice, nome] as const);

describe('nomeDoMes', () => {
  it.each(mesesNumerados)('índice %s (de zero) é %s', (indice, nome) => {
    expect(nomeDoMes(indice)).toBe(nome);
  });

  it.each([[12], [-1], [1.5], [Number.NaN]])('índice %s fora de 0 a 11 devolve vazio', (indice) => {
    expect(nomeDoMes(indice)).toBe('');
  });
});
