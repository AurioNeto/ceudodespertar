import { describe, expect, it } from 'vitest';
import { gerarUuidV7 } from './ids.js';
import type { Relogio } from './ids.js';

function relogioFixo(timestampEmMs: number): Relogio {
  return { agora: () => timestampEmMs };
}

function decodificarTimestampEmMs(uuid: string): number {
  const hexSemHifens = uuid.replace(/-/g, '');
  return parseInt(hexSemHifens.slice(0, 12), 16);
}

const FORMATO_UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO = Date.UTC(2026, 0, 1) + 173;
const QUANTIDADE_DE_AMOSTRAS_PARA_VERSAO_E_VARIANTE = 2000;

describe('gerarUuidV7', () => {
  it('produz um UUID com versão 7 e variante 10 em uma amostragem ampla', () => {
    for (let i = 0; i < QUANTIDADE_DE_AMOSTRAS_PARA_VERSAO_E_VARIANTE; i++) {
      expect(gerarUuidV7(relogioFixo(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO))).toMatch(FORMATO_UUID_V7);
    }
  });

  it('usa o relógio do sistema quando nenhum é informado', () => {
    expect(gerarUuidV7()).toMatch(FORMATO_UUID_V7);
  });

  it('codifica o timestamp injetado nos 48 bits iniciais', () => {
    const uuid = gerarUuidV7(relogioFixo(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO));

    expect(decodificarTimestampEmMs(uuid)).toBe(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO);
  });

  it('ordena de forma crescente para timestamps um milissegundo à frente um do outro', () => {
    const anterior = gerarUuidV7(relogioFixo(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO));
    const posterior = gerarUuidV7(relogioFixo(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO + 1));

    expect(anterior < posterior).toBe(true);
  });

  it('ordena de forma crescente para timestamps distantes entre si', () => {
    const anterior = gerarUuidV7(relogioFixo(Date.UTC(2026, 0, 1)));
    const posterior = gerarUuidV7(relogioFixo(Date.UTC(2026, 0, 2)));

    expect(anterior < posterior).toBe(true);
  });

  it('gera valores distintos para o mesmo instante', () => {
    const relogio = relogioFixo(TIMESTAMP_COM_BYTES_BAIXOS_NAO_ZERO);

    expect(gerarUuidV7(relogio)).not.toBe(gerarUuidV7(relogio));
  });
});
