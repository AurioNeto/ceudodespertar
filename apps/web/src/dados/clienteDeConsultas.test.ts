import { describe, expect, it, vi } from 'vitest';
import {
  JANELA_DE_FRESCOR_EM_MS,
  criarClienteDeConsultas,
  deveTentarDeNovo,
  esperaAntesDeTentarDeNovo,
} from './clienteDeConsultas';
import { ErroDaApi, ErroDeRede } from './erros';
import type { CodigoDeErro } from '@cdd/contracts';

function erroDaApi(status: number, codigo: CodigoDeErro): ErroDaApi {
  return new ErroDaApi({ status, codigo });
}

describe('retry do cliente de consultas', () => {
  it('tenta de novo em falha de rede', () => {
    expect(deveTentarDeNovo(0, new ErroDeRede(new TypeError('x')))).toBe(true);
  });

  it.each(['PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', 'SERVICO_INDISPONIVEL'] as const)(
    'tenta de novo em 503 (%s)',
    (codigo) => {
      expect(deveTentarDeNovo(0, erroDaApi(503, codigo))).toBe(true);
    },
  );

  it.each([
    [400, 'CORPO_INVALIDO'],
    [401, 'NAO_AUTENTICADO'],
    [401, 'USUARIO_SUSPENSO'],
    [403, 'SEM_PERMISSAO'],
    [404, 'RECURSO_NAO_ENCONTRADO'],
    [409, 'VERSAO_DESATUALIZADA'],
    [422, 'PERIODO_FECHADO'],
    [428, 'VERSAO_OBRIGATORIA'],
    [500, 'ERRO_INTERNO'],
  ] as const)('não tenta de novo em %i %s', (status, codigo) => {
    expect(deveTentarDeNovo(0, erroDaApi(status, codigo))).toBe(false);
  });

  it('não tenta de novo em erro desconhecido nem em abort', () => {
    expect(deveTentarDeNovo(0, new Error('qualquer'))).toBe(false);
    expect(deveTentarDeNovo(0, new DOMException('x', 'AbortError'))).toBe(false);
  });

  it('para depois de duas tentativas extras', () => {
    const erro = new ErroDeRede(new TypeError('x'));

    expect(deveTentarDeNovo(1, erro)).toBe(true);
    expect(deveTentarDeNovo(2, erro)).toBe(false);
  });

  it('a espera cresce e tem teto', () => {
    expect(esperaAntesDeTentarDeNovo(0)).toBeLessThan(esperaAntesDeTentarDeNovo(1));
    expect(esperaAntesDeTentarDeNovo(20)).toBe(esperaAntesDeTentarDeNovo(10));
  });
});

describe('padrões do QueryClient', () => {
  it('carrega retry, frescor e foco explícitos', () => {
    const padroes = criarClienteDeConsultas().getDefaultOptions();

    expect(padroes.queries?.retry).toBe(deveTentarDeNovo);
    expect(padroes.queries?.staleTime).toBe(JANELA_DE_FRESCOR_EM_MS);
    expect(padroes.queries?.refetchOnWindowFocus).toBe(false);
    expect(padroes.mutations?.retry).toBe(false);
  });

  it('uma consulta com erro 4xx falha na primeira tentativa, sem repetir', async () => {
    const cliente = criarClienteDeConsultas();
    let chamadas = 0;

    await cliente
      .fetchQuery({
        queryKey: ['k4xx'],
        queryFn: () => {
          chamadas += 1;
          return Promise.reject(erroDaApi(404, 'RECURSO_NAO_ENCONTRADO'));
        },
      })
      .catch(() => undefined);

    expect(chamadas).toBe(1);
  });

  it('uma consulta com ErroDeRede é repetida até o limite', async () => {
    const cliente = criarClienteDeConsultas();
    let chamadas = 0;

    vi.useFakeTimers();
    const execucao = cliente
      .fetchQuery({
        queryKey: ['krede'],
        queryFn: () => {
          chamadas += 1;
          return Promise.reject(new ErroDeRede(new TypeError('x')));
        },
      })
      .catch(() => undefined);
    await vi.advanceTimersByTimeAsync(10_000);
    await execucao;
    vi.useRealTimers();

    expect(chamadas).toBe(3);
  });
});
