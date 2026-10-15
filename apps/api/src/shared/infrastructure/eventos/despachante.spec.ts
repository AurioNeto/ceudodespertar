import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { ErroDeAmbienteInvalido } from '../configuracao/esquema-de-ambiente.js';
import {
  Despachante,
  MENSAGEM_DE_FALHA_DE_INFRAESTRUTURA_NO_CICLO,
  TIMEOUT_MAXIMO_DO_CONSUMIDOR_EM_MS,
  TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS,
  lerTimeoutDoConsumidorEmMs,
} from './despachante.js';
import type { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';

describe('lerTimeoutDoConsumidorEmMs', () => {
  it('usa o padrão quando a variável de ambiente não está definida', () => {
    expect(lerTimeoutDoConsumidorEmMs({})).toBe(TIMEOUT_PADRAO_DO_CONSUMIDOR_EM_MS);
  });

  it('usa o valor configurado quando é um inteiro positivo dentro do limite', () => {
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: '50' })).toBe(50);
    expect(lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: String(TIMEOUT_MAXIMO_DO_CONSUMIDOR_EM_MS) })).toBe(
      TIMEOUT_MAXIMO_DO_CONSUMIDOR_EM_MS,
    );
  });

  it.each(['abc', '', '0', '-5', '1.5', '1e3x', String(TIMEOUT_MAXIMO_DO_CONSUMIDOR_EM_MS + 1)])(
    'recusa a partida com %j em vez de cair no padrão em silêncio',
    (valor) => {
      expect(() => lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: valor })).toThrow(ErroDeAmbienteInvalido);
    },
  );

  it('a mensagem diz o nome da variável e o intervalo aceito, sem ecoar o valor recebido', () => {
    expect(() => lerTimeoutDoConsumidorEmMs({ TIMEOUT_DO_CONSUMIDOR_EM_MS: 'segredo-123' })).toThrow(
      /^Ambiente inválido:\nTIMEOUT_DO_CONSUMIDOR_EM_MS: deve ser um inteiro de 1 a \d+ milissegundos$/,
    );
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
      'api',
    );
    despachante.onModuleInit();

    sinalizador.notificar();
    await vi.waitFor(() => expect(erros).toHaveBeenCalled());
    await despachante.onModuleDestroy();

    const textoLogado = erros.mock.calls
      .map((chamada) => chamada.map((parte) => (typeof parte === 'string' ? parte : JSON.stringify(parte))).join(' '))
      .join('\n');
    expect(textoLogado).toContain(MENSAGEM_DE_FALHA_DE_INFRAESTRUTURA_NO_CICLO);
    expect(textoLogado).toContain('Error: 23505');
    expect(textoLogado).not.toContain('o consumidor falhou');
    expect(textoLogado).not.toContain('fulana');
    expect(textoLogado).not.toContain('exemplo.com');
    expect(textoLogado).not.toContain('already exists');
    expect(textoLogado).not.toContain('    at ');
  });

  it('loga error só na primeira falha seguida e info quando o ciclo se recupera', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    let bancoForaDoAr = true;
    const transacao = vi.fn(() => (bancoForaDoAr ? Promise.reject(new Error('banco fora')) : Promise.resolve(false)));
    const unidade = { transacao } as unknown as UnidadeDeTrabalho;
    const sinalizador = new SinalizadorDeEventos();
    const despachante = new Despachante(unidade, {} as unknown as RegistroDeConsumidores, sinalizador, 100, 'api');
    despachante.onModuleInit();

    const falhasSeguidas = 3;
    for (let tentativa = 1; tentativa <= falhasSeguidas; tentativa += 1) {
      sinalizador.notificar();
      // eslint-disable-next-line no-await-in-loop -- cada ciclo precisa terminar antes do próximo sinal
      await vi.waitFor(() => expect(transacao).toHaveBeenCalledTimes(tentativa));
    }
    await despachante.executarCiclo().catch(() => undefined);
    expect(erros).toHaveBeenCalledTimes(1);
    expect(informacoes).not.toHaveBeenCalled();

    bancoForaDoAr = false;
    sinalizador.notificar();
    await vi.waitFor(() => expect(informacoes).toHaveBeenCalledTimes(1));
    sinalizador.notificar();
    await despachante.onModuleDestroy();

    expect(erros).toHaveBeenCalledTimes(1);
    expect(informacoes).toHaveBeenCalledTimes(1);
  });
});
