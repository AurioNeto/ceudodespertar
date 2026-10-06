import { vi } from 'vitest';
import type { CodigoDeErro } from '@cdd/contracts';
import type { FonteDeCredencial, ResultadoDaRenovacao } from './credencial';

export interface FonteDeCredencialFalsa extends FonteDeCredencial {
  readonly tokenAtual: ReturnType<typeof vi.fn<() => Promise<string | null>>>;
  readonly renovar: ReturnType<typeof vi.fn<() => Promise<ResultadoDaRenovacao>>>;
  readonly aoSessaoEncerrada: ReturnType<typeof vi.fn<() => void>>;
}

export function criarFonteDeCredencialFalsa(
  opcoes: { renovacao?: () => Promise<ResultadoDaRenovacao> } = {},
): FonteDeCredencialFalsa {
  let token = 'token-velho';
  return {
    tokenAtual: vi.fn(() => Promise.resolve(token)),
    renovar: vi.fn(
      opcoes.renovacao ??
        (() => {
          token = 'token-novo';
          return Promise.resolve('renovado');
        }),
    ),
    aoSessaoEncerrada: vi.fn(),
  };
}

export function respostaJson(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function respostaDeErro(status: number, erro: CodigoDeErro): Response {
  return respostaJson(status, { erro, correlacaoId: `corr-${status}` });
}

export function criarFetchFalso(...respostas: Array<Response | Error>) {
  const fila = [...respostas];
  return vi.fn<typeof globalThis.fetch>((_entrada, _init) => {
    const proxima = fila.shift();
    if (proxima === undefined) return Promise.reject(new Error('fila de respostas esgotada'));
    return proxima instanceof Error ? Promise.reject(proxima) : Promise.resolve(proxima);
  });
}

export function cabecalhosDaChamada(
  fetchFalso: ReturnType<typeof criarFetchFalso>,
  indice: number,
): Headers {
  const chamada = fetchFalso.mock.calls[indice];
  if (!chamada) throw new Error(`chamada ${indice} inexistente`);
  return new Headers(chamada[1]?.headers);
}
