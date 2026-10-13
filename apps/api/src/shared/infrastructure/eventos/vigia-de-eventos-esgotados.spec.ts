import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { ContextoDaTransacao, ModoDeTransacao, UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import {
  INTERVALO_DA_VIGIA_EM_MS,
  MARCACAO_DOS_NOVOS_ESGOTADOS,
  MAXIMO_DE_EVENTOS_NO_ALERTA,
  MENSAGEM_DE_EVENTOS_ESGOTADOS,
  MENSAGEM_DE_FALHA_NA_VERIFICACAO,
  MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO,
  VigiaDeEventosEsgotados,
} from './vigia-de-eventos-esgotados.js';

interface Rodada {
  readonly novos: readonly string[];
  readonly quantidade: number;
  readonly maisAntigoEm?: Date | string | null;
}

const NENHUM: Rodada = { novos: [], quantidade: 0 };
const MAIS_ANTIGO = new Date('2026-10-01T12:00:00.000Z');

function unidadeQueResponde(rodadas: (Rodada | Error)[], modos: ModoDeTransacao[] = []): UnidadeDeTrabalho {
  const fila = [...rodadas];
  return {
    transacao: async (modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<unknown>) => {
      modos.push(modo);
      const proxima = fila.shift() ?? NENHUM;
      if (proxima instanceof Error) throw proxima;
      const contexto = {
        em: {
          execute: (sql: string) =>
            Promise.resolve(
              sql === MARCACAO_DOS_NOVOS_ESGOTADOS
                ? proxima.novos.map((eventoId) => ({ eventoId }))
                : [{ quantidade: proxima.quantidade, maisAntigoEm: proxima.maisAntigoEm ?? MAIS_ANTIGO }],
            ),
        },
      } as unknown as ContextoDaTransacao;
      return fn(contexto);
    },
  } as unknown as UnidadeDeTrabalho;
}

async function verificarEmSequencia(rodadas: (Rodada | Error)[]): Promise<void> {
  const vigia = new VigiaDeEventosEsgotados(unidadeQueResponde(rodadas), 'api');
  for (let rodada = 0; rodada < rodadas.length; rodada += 1) {
    // eslint-disable-next-line no-await-in-loop -- cada rodada depende do estado deixado pela anterior
    await vigia.verificar();
  }
}

describe('VigiaDeEventosEsgotados', () => {
  let erros: MockInstance;
  let avisos: MockInstance;
  let informacoes: MockInstance;

  beforeEach(() => {
    erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    avisos = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('marca e conta numa transação de escrita', async () => {
    const modos: ModoDeTransacao[] = [];

    await new VigiaDeEventosEsgotados(unidadeQueResponde([NENHUM], modos), 'api').verificar();

    expect(modos).toStrictEqual(['escrita']);
  });

  it('não loga nada enquanto não há evento esgotado', async () => {
    await verificarEmSequencia([NENHUM, NENHUM]);

    expect(erros).not.toHaveBeenCalled();
    expect(informacoes).not.toHaveBeenCalled();
  });

  it('alerta com os novos esgotados, o total e o mais antigo', async () => {
    await verificarEmSequencia([{ novos: ['evt-b', 'evt-a'], quantidade: 3 }]);

    expect(erros).toHaveBeenCalledTimes(1);
    expect(erros).toHaveBeenCalledWith(
      { novos: 2, eventos: ['evt-a', 'evt-b'], quantidade: 3, maisAntigoEm: MAIS_ANTIGO.toISOString() },
      MENSAGEM_DE_EVENTOS_ESGOTADOS,
    );
  });

  it('não alerta de novo quando nada novo foi marcado, mesmo com esgotados parados', async () => {
    await verificarEmSequencia([
      { novos: ['evt-a'], quantidade: 1 },
      { novos: [], quantidade: 1 },
      { novos: [], quantidade: 1 },
    ]);

    expect(erros).toHaveBeenCalledTimes(1);
  });

  it('um esgotado resolvido e outro novo na mesma rodada, com a mesma quantidade, ainda alertam', async () => {
    await verificarEmSequencia([
      { novos: ['evt-a'], quantidade: 1 },
      { novos: ['evt-b'], quantidade: 1 },
    ]);

    expect(erros.mock.calls.map(([campos]) => (campos as { eventos: string[] }).eventos)).toStrictEqual([
      ['evt-a'],
      ['evt-b'],
    ]);
  });

  it('limita a lista de eventos do alerta e mantém a contagem dos novos', async () => {
    const novos = Array.from({ length: MAXIMO_DE_EVENTOS_NO_ALERTA + 5 }, (_, i) => `evt-${String(i).padStart(3, '0')}`);

    await verificarEmSequencia([{ novos, quantidade: novos.length }]);

    const [campos] = erros.mock.calls[0] as [{ novos: number; eventos: string[] }];
    expect(campos.novos).toBe(novos.length);
    expect(campos.eventos).toHaveLength(MAXIMO_DE_EVENTOS_NO_ALERTA);
  });

  it('loga um info quando a contagem volta a 0, e só uma vez', async () => {
    await verificarEmSequencia([{ novos: ['evt-a'], quantidade: 3 }, NENHUM, NENHUM]);

    expect(informacoes).toHaveBeenCalledTimes(1);
    expect(informacoes).toHaveBeenCalledWith({ quantidadeAnterior: 3 }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO);
  });

  it('aceita o mais antigo vindo do driver como texto', async () => {
    await verificarEmSequencia([{ novos: ['evt-a'], quantidade: 1, maisAntigoEm: '2026-10-01 12:00:00+00' }]);

    expect(erros).toHaveBeenCalledWith(
      expect.objectContaining({ maisAntigoEm: MAIS_ANTIGO.toISOString() }),
      MENSAGEM_DE_EVENTOS_ESGOTADOS,
    );
  });

  it('com a verificação falhando, avisa sem o detalhe do driver e não alerta', async () => {
    const erroDoDriver = Object.assign(new Error('falhou para fulana@exemplo.com'), {
      code: '57014',
      detail: 'Key (email)=(fulana@exemplo.com)',
    });

    await verificarEmSequencia([erroDoDriver]);

    expect(erros).not.toHaveBeenCalled();
    expect(avisos).toHaveBeenCalledWith({ erro: 'Error' }, MENSAGEM_DE_FALHA_NA_VERIFICACAO);
    expect(JSON.stringify(avisos.mock.calls)).not.toContain('fulana');
  });

  describe('agendamento', () => {
    it('rodadas do temporizador são encadeadas, sem sobreposição', async () => {
      vi.useFakeTimers();
      let emAndamento = 0;
      let maximoSimultaneo = 0;
      let liberar: () => void = () => undefined;
      const unidade = {
        transacao: async () => {
          emAndamento += 1;
          maximoSimultaneo = Math.max(maximoSimultaneo, emAndamento);
          await new Promise<void>((resolver) => {
            liberar = resolver;
          });
          emAndamento -= 1;
          return { novos: [], contagem: { quantidade: 0, maisAntigoEm: null } };
        },
      } as unknown as UnidadeDeTrabalho;
      const vigia = new VigiaDeEventosEsgotados(unidade, 'api');

      vigia.onModuleInit();
      await vi.advanceTimersByTimeAsync(INTERVALO_DA_VIGIA_EM_MS * 3);
      expect(emAndamento).toBe(1);
      for (let rodada = 0; rodada < 3; rodada += 1) {
        liberar();
        // eslint-disable-next-line no-await-in-loop -- libera uma rodada por vez
        await vi.advanceTimersByTimeAsync(0);
      }
      const destruicao = vigia.onModuleDestroy();
      liberar();
      await destruicao;

      expect(maximoSimultaneo).toBe(1);
    });

    it('ao destruir o módulo aguarda a rodada em andamento terminar', async () => {
      vi.useFakeTimers();
      let liberar: () => void = () => undefined;
      const unidade = {
        transacao: () =>
          new Promise((resolver) => {
            liberar = () => resolver({ novos: [], contagem: { quantidade: 0, maisAntigoEm: null } });
          }),
      } as unknown as UnidadeDeTrabalho;
      const vigia = new VigiaDeEventosEsgotados(unidade, 'api');
      vigia.onModuleInit();
      await vi.advanceTimersByTimeAsync(INTERVALO_DA_VIGIA_EM_MS);
      let destruido = false;

      const destruicao = vigia.onModuleDestroy().then(() => {
        destruido = true;
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(destruido).toBe(false);
      liberar();
      await destruicao;

      expect(destruido).toBe(true);
    });

    it('uma rodada que rejeita avisa e não interrompe as seguintes', async () => {
      vi.useFakeTimers();
      const vigia = new VigiaDeEventosEsgotados(unidadeQueResponde([]), 'api');
      const verificar = vi
        .spyOn(vigia, 'verificar')
        .mockRejectedValueOnce(new TypeError('inesperado'))
        .mockResolvedValue(undefined);

      vigia.onModuleInit();
      await vi.advanceTimersByTimeAsync(INTERVALO_DA_VIGIA_EM_MS * 2);
      await vigia.onModuleDestroy();

      expect(verificar).toHaveBeenCalledTimes(2);
      expect(avisos).toHaveBeenCalledWith({ erro: 'TypeError' }, MENSAGEM_DE_FALHA_NA_VERIFICACAO);
    });

    it('no processo de CLI não agenda verificação', async () => {
      vi.useFakeTimers();
      const transacao = vi.fn();
      const vigia = new VigiaDeEventosEsgotados({ transacao } as unknown as UnidadeDeTrabalho, 'cli');

      vigia.onModuleInit();
      await vi.advanceTimersByTimeAsync(INTERVALO_DA_VIGIA_EM_MS * 2);
      await vigia.onModuleDestroy();

      expect(transacao).not.toHaveBeenCalled();
    });
  });
});
