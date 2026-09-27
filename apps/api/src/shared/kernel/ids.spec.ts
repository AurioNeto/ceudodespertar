import { describe, expect, it } from 'vitest';
import { gerarUuidV7 } from './ids.js';
import type { Relogio } from './ids.js';

function relogioFixo(timestampEmMs: number): Relogio {
  return { agora: () => timestampEmMs };
}

const FORMATO_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('gerarUuidV7', () => {
  it('produz um UUID com versão 7 e variante 10', () => {
    expect(gerarUuidV7(relogioFixo(Date.UTC(2026, 0, 1)))).toMatch(FORMATO_UUID_V7);
  });

  it('usa o relógio do sistema quando nenhum é informado', () => {
    expect(gerarUuidV7()).toMatch(FORMATO_UUID_V7);
  });

  it('ordena de forma crescente para timestamps crescentes', () => {
    const anterior = gerarUuidV7(relogioFixo(Date.UTC(2026, 0, 1)));
    const posterior = gerarUuidV7(relogioFixo(Date.UTC(2026, 0, 2)));

    expect(anterior < posterior).toBe(true);
  });

  it('gera valores distintos para o mesmo instante', () => {
    const relogio = relogioFixo(Date.UTC(2026, 0, 1));

    expect(gerarUuidV7(relogio)).not.toBe(gerarUuidV7(relogio));
  });
});
