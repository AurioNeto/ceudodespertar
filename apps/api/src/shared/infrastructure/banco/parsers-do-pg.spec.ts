import { describe, expect, it } from 'vitest';
import { analisarInt8, ErroDeInt8ForaDoLimiteSeguro } from './parsers-do-pg.js';

describe('analisarInt8', () => {
  it('converte um int8 dentro do limite seguro para number', () => {
    expect(analisarInt8('42')).toBe(42);
    expect(analisarInt8(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    expect(analisarInt8(String(-Number.MAX_SAFE_INTEGER))).toBe(-Number.MAX_SAFE_INTEGER);
  });

  it('recusa um int8 acima do limite seguro', () => {
    const acimaDoLimite = String(BigInt(Number.MAX_SAFE_INTEGER) + 1n);

    expect(() => analisarInt8(acimaDoLimite)).toThrow(ErroDeInt8ForaDoLimiteSeguro);
  });

  it('recusa um int8 abaixo do limite seguro negativo', () => {
    const abaixoDoLimite = String(-BigInt(Number.MAX_SAFE_INTEGER) - 1n);

    expect(() => analisarInt8(abaixoDoLimite)).toThrow(ErroDeInt8ForaDoLimiteSeguro);
  });
});
