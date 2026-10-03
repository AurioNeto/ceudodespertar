import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import {
  Despachante,
  TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS,
  lerTimeoutDoConsumidorEmMs,
} from './despachante.js';
import type { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';

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

describe('Despachante · falha do ciclo acordado pelo sinal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('não loga o stack nem o detail do driver, onde o dado pessoal aparece', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const erroDoDriver = Object.assign(new Error('insert falhou para fulana@exemplo.com'), {
      code: '23505',
      detail: 'Key (email)=(fulana@exemplo.com) already exists.',
    });
    const unidadeQueFalha = {
      transacao: () => Promise.reject(erroDoDriver),
    } as unknown as UnidadeDeTrabalho;
    const sinalizador = new SinalizadorDeEventos();
    const despachante = new Despachante(
      unidadeQueFalha,
      {} as unknown as RegistroDeConsumidores,
      sinalizador,
      100,
    );
    despachante.onModuleInit();

    sinalizador.notificar();
    await vi.waitFor(() => expect(erros).toHaveBeenCalled());
    await despachante.onModuleDestroy();

    const textoLogado = erros.mock.calls.map((chamada) => chamada.map(String).join(' ')).join('\n');
    expect(textoLogado).toContain('23505');
    expect(textoLogado).not.toContain('fulana');
    expect(textoLogado).not.toContain('exemplo.com');
    expect(textoLogado).not.toContain('already exists');
    expect(textoLogado).not.toContain('    at ');
  });
});
