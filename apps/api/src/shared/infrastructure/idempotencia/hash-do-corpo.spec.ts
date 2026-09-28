import { describe, expect, it } from 'vitest';
import { calcularHashDoCorpo } from './hash-do-corpo.js';

describe('calcularHashDoCorpo', () => {
  it('é estável para o mesmo corpo lógico com chaves em ordens diferentes', () => {
    const hashA = calcularHashDoCorpo({ nome: 'Ana', valor: 10 });
    const hashB = calcularHashDoCorpo({ valor: 10, nome: 'Ana' });

    expect(hashA).toBe(hashB);
  });

  it('muda quando um valor do corpo muda', () => {
    const hashA = calcularHashDoCorpo({ nome: 'Ana', valor: 10 });
    const hashB = calcularHashDoCorpo({ nome: 'Ana', valor: 11 });

    expect(hashA).not.toBe(hashB);
  });

  it('é estável para corpos aninhados com ordens diferentes', () => {
    const hashA = calcularHashDoCorpo({ pessoa: { nome: 'Ana', idade: 30 }, itens: [1, 2] });
    const hashB = calcularHashDoCorpo({ itens: [1, 2], pessoa: { idade: 30, nome: 'Ana' } });

    expect(hashA).toBe(hashB);
  });

  it('trata corpo ausente e corpo nulo como o mesmo hash', () => {
    expect(calcularHashDoCorpo(undefined)).toBe(calcularHashDoCorpo(null));
  });
});
