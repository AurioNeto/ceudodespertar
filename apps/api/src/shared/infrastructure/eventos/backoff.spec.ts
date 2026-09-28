import { describe, expect, it } from 'vitest';
import { calcularProximaTentativa } from './backoff.js';

const AGORA = new Date('2026-01-01T00:00:00Z');
const UM_SEGUNDO_EM_MS = 1000;
const CINCO_MINUTOS_EM_MS = 5 * 60 * 1000;

describe('calcularProximaTentativa', () => {
  it.each([
    [1, UM_SEGUNDO_EM_MS],
    [2, 2 * UM_SEGUNDO_EM_MS],
    [3, 4 * UM_SEGUNDO_EM_MS],
    [4, 8 * UM_SEGUNDO_EM_MS],
  ])('tentativa %s soma %sms ao instante atual', (tentativas, atrasoEsperadoEmMs) => {
    expect(calcularProximaTentativa(tentativas, AGORA).getTime()).toBe(AGORA.getTime() + atrasoEsperadoEmMs);
  });

  it('nunca ultrapassa o teto de 5 minutos, mesmo com muitas tentativas', () => {
    expect(calcularProximaTentativa(20, AGORA).getTime()).toBe(AGORA.getTime() + CINCO_MINUTOS_EM_MS);
  });
});
