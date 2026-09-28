import { describe, expect, it } from 'vitest';
import { TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS, lerTimeoutDoConsumidorEmMs } from './despachante.js';

describe('lerTimeoutDoConsumidorEmMs', () => {
  it('usa o padrão quando a variável de ambiente não está definida', () => {
    expect(lerTimeoutDoConsumidorEmMs({})).toBe(TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS);
  });

  it('usa o padrão quando a variável de ambiente não é um número válido', () => {
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: 'abc' })).toBe(
      TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS,
    );
  });

  it('usa o padrão quando a variável de ambiente é zero ou negativa', () => {
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: '0' })).toBe(
      TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS,
    );
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: '-5' })).toBe(
      TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS,
    );
  });

  it('usa o valor configurado quando é um número válido e positivo', () => {
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: '50' })).toBe(50);
  });
});
