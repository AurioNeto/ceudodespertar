import { describe, expect, it } from 'vitest';
import { formatarDataHora, iniciais } from './formato';

describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('Maria das Graças Souza')).toBe('MS');
  });

  it('usa só a primeira letra quando há um nome', () => {
    expect(iniciais('  Joana  ')).toBe('J');
  });

  it('ignora palavras que não começam com letra', () => {
    expect(iniciais('Aurio Neto (demonstração)')).toBe('AN');
    expect(iniciais('Élida - 2')).toBe('É');
  });

  it('devolve vazio para nome sem letras', () => {
    expect(iniciais('   ')).toBe('');
  });
});

describe('formatarDataHora', () => {
  it('converte o instante para data e hora de São Paulo', () => {
    expect(formatarDataHora('2026-10-09T17:30:00.000Z')).toBe('09/10/2026 14:30');
  });

  it('vira o dia pelo fuso da casa', () => {
    expect(formatarDataHora('2026-10-10T02:05:00.000Z')).toBe('09/10/2026 23:05');
  });
});
