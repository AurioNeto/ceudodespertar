import { describe, expect, it } from 'vitest';
import { iniciais } from './formato';

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
