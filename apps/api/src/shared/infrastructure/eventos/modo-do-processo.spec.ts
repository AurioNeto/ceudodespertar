import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { Despachante } from './despachante.js';
import { EventosModule } from './eventos.module.js';
import { ErroDeModoDoProcessoInvalido, MODO_DO_PROCESSO, lerModoDoProcesso } from './modo-do-processo.js';
import type { ModoDoProcesso } from './modo-do-processo.js';
import type { RegistroDeConsumidores } from './registro-de-consumidores.js';
import { SinalizadorDeEventos } from './sinalizador-de-eventos.js';
import { VigiaDeEventosEsgotados } from './vigia-de-eventos-esgotados.js';

function criarDespachante(modo: ModoDoProcesso, sinalizador: SinalizadorDeEventos): Despachante {
  const unidade = { transacao: vi.fn(() => Promise.resolve(false)) } as unknown as UnidadeDeTrabalho;
  return new Despachante(unidade, {} as unknown as RegistroDeConsumidores, sinalizador, 100, modo);
}

function criarVigia(modo: ModoDoProcesso): VigiaDeEventosEsgotados {
  const unidade = { transacao: vi.fn(() => Promise.resolve([])) } as unknown as UnidadeDeTrabalho;
  return new VigiaDeEventosEsgotados(unidade, modo);
}

describe('lerModoDoProcesso', () => {
  it('assume api quando CDD_PROCESSO está ausente', () => {
    expect(lerModoDoProcesso({})).toBe('api');
  });

  it.each([['api'], ['cli']])('aceita %s', (valor) => {
    expect(lerModoDoProcesso({ CDD_PROCESSO: valor })).toBe(valor);
  });

  it.each([[''], ['CLI'], ['worker'], [' cli']])('falha alto com "%s"', (valor) => {
    expect(() => lerModoDoProcesso({ CDD_PROCESSO: valor })).toThrow(ErroDeModoDoProcessoInvalido);
  });
});

describe('EventosModule', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function resolverModoDoModulo(): ModoDoProcesso {
    const provedores: { provide: unknown; useFactory?: () => ModoDoProcesso }[] = Reflect.getMetadata(
      'providers',
      EventosModule,
    );
    const provedor = provedores.find((candidato) => candidato.provide === MODO_DO_PROCESSO);
    return provedor?.useFactory?.() ?? 'api';
  }

  it('provê o modo lido de CDD_PROCESSO', () => {
    vi.stubEnv('CDD_PROCESSO', 'cli');

    expect(resolverModoDoModulo()).toBe('cli');
  });

  it('provê api quando CDD_PROCESSO está ausente', () => {
    vi.stubEnv('CDD_PROCESSO', undefined);

    expect(resolverModoDoModulo()).toBe('api');
  });
});

describe('pollers conforme o modo do processo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Despachante', () => {
    it('em cli não cria timer nem assina o sinalizador', async () => {
      const sinalizador = new SinalizadorDeEventos();
      const assinatura = vi.spyOn(sinalizador, 'aoNotificar');
      const despachante = criarDespachante('cli', sinalizador);

      despachante.onModuleInit();

      expect(vi.getTimerCount()).toBe(0);
      expect(assinatura).not.toHaveBeenCalled();
      await despachante.onModuleDestroy();
    });

    it('em api cria o timer e assina o sinalizador', async () => {
      const sinalizador = new SinalizadorDeEventos();
      const assinatura = vi.spyOn(sinalizador, 'aoNotificar');
      const despachante = criarDespachante('api', sinalizador);

      despachante.onModuleInit();

      expect(vi.getTimerCount()).toBeGreaterThan(0);
      expect(assinatura).toHaveBeenCalledTimes(1);
      await despachante.onModuleDestroy();
    });
  });

  describe('VigiaDeEventosEsgotados', () => {
    it('em cli não cria timer', () => {
      const vigia = criarVigia('cli');

      vigia.onModuleInit();

      expect(vi.getTimerCount()).toBe(0);
      vigia.onModuleDestroy();
    });

    it('em api cria o timer', () => {
      const vigia = criarVigia('api');

      vigia.onModuleInit();

      expect(vi.getTimerCount()).toBeGreaterThan(0);
      vigia.onModuleDestroy();
    });
  });
});
