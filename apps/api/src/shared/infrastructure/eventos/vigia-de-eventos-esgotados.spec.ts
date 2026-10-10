import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import type { ContextoDaTransacao, UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import {
  MENSAGEM_DE_EVENTOS_ESGOTADOS,
  MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO,
  VigiaDeEventosEsgotados,
} from './vigia-de-eventos-esgotados.js';

interface Contagem {
  readonly quantidade: number;
  readonly maisAntigoEm: Date | null;
}

const NENHUM: Contagem = { quantidade: 0, maisAntigoEm: null };
const MAIS_ANTIGO = new Date('2026-10-01T12:00:00.000Z');

function unidadeQueResponde(contagens: (Contagem | Error)[]): UnidadeDeTrabalho {
  const fila = [...contagens];
  return {
    transacao: async (_modo: string, fn: (contexto: ContextoDaTransacao) => Promise<unknown>) => {
      const proxima = fila.shift() ?? NENHUM;
      const contexto = {
        em: {
          execute: () => (proxima instanceof Error ? Promise.reject(proxima) : Promise.resolve([proxima])),
        },
      } as unknown as ContextoDaTransacao;
      return fn(contexto);
    },
  } as unknown as UnidadeDeTrabalho;
}

async function verificarEmSequencia(contagens: (Contagem | Error)[]): Promise<void> {
  const vigia = new VigiaDeEventosEsgotados(unidadeQueResponde(contagens), 'api');
  for (let ciclo = 0; ciclo < contagens.length; ciclo += 1) {
    // eslint-disable-next-line no-await-in-loop -- cada ciclo depende do estado deixado pelo anterior
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
    vi.restoreAllMocks();
  });

  it('não loga nada enquanto não há evento esgotado', async () => {
    await verificarEmSequencia([NENHUM, NENHUM]);

    expect(erros).not.toHaveBeenCalled();
    expect(informacoes).not.toHaveBeenCalled();
  });

  it('loga um error com quantidade e mais antigo quando a contagem sai de 0', async () => {
    await verificarEmSequencia([NENHUM, { quantidade: 3, maisAntigoEm: MAIS_ANTIGO }]);

    expect(erros).toHaveBeenCalledTimes(1);
    expect(erros).toHaveBeenCalledWith(
      { quantidade: 3, maisAntigoEm: MAIS_ANTIGO.toISOString() },
      MENSAGEM_DE_EVENTOS_ESGOTADOS,
    );
  });

  it('não repete o error enquanto a contagem não muda', async () => {
    const tres = { quantidade: 3, maisAntigoEm: MAIS_ANTIGO };

    await verificarEmSequencia([tres, tres, tres]);

    expect(erros).toHaveBeenCalledTimes(1);
  });

  it('loga um novo error quando a contagem muda de N para M', async () => {
    await verificarEmSequencia([
      { quantidade: 3, maisAntigoEm: MAIS_ANTIGO },
      { quantidade: 5, maisAntigoEm: MAIS_ANTIGO },
      { quantidade: 2, maisAntigoEm: MAIS_ANTIGO },
    ]);

    expect(erros.mock.calls.map(([campos]) => (campos as Contagem).quantidade)).toStrictEqual([3, 5, 2]);
  });

  it('loga um info quando a contagem volta a 0, e só uma vez', async () => {
    await verificarEmSequencia([{ quantidade: 3, maisAntigoEm: MAIS_ANTIGO }, NENHUM, NENHUM]);

    expect(erros).toHaveBeenCalledTimes(1);
    expect(informacoes).toHaveBeenCalledTimes(1);
    expect(informacoes).toHaveBeenCalledWith({ quantidadeAnterior: 3 }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO);
  });

  it('aceita o mais antigo vindo do driver como texto', async () => {
    await verificarEmSequencia([
      { quantidade: 1, maisAntigoEm: '2026-10-01 12:00:00+00' as unknown as Date },
    ]);

    expect(erros).toHaveBeenCalledWith(
      { quantidade: 1, maisAntigoEm: MAIS_ANTIGO.toISOString() },
      MENSAGEM_DE_EVENTOS_ESGOTADOS,
    );
  });

  it('com a consulta falhando, avisa sem o detalhe do driver e mantém a última contagem conhecida', async () => {
    const erroDoDriver = Object.assign(new Error('falhou para fulana@exemplo.com'), {
      code: '57014',
      detail: 'Key (email)=(fulana@exemplo.com)',
    });

    await verificarEmSequencia([
      { quantidade: 3, maisAntigoEm: MAIS_ANTIGO },
      erroDoDriver,
      { quantidade: 3, maisAntigoEm: MAIS_ANTIGO },
    ]);

    expect(erros).toHaveBeenCalledTimes(1);
    expect(avisos).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(avisos.mock.calls)).not.toContain('Key (email)');
  });
});
