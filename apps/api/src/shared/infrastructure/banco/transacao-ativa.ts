import { AsyncLocalStorage } from 'node:async_hooks';
import type { ContextoDaTransacao, ModoDeTransacao } from './unidade-de-trabalho.js';

export interface EstadoDaTransacao {
  aberta: boolean;
  instituicaoId: string | undefined;
}

export interface TransacaoAtiva {
  readonly modo: ModoDeTransacao;
  readonly contexto: ContextoDaTransacao;
  readonly estado: EstadoDaTransacao;
}

export const transacaoAtiva = new AsyncLocalStorage<TransacaoAtiva>();

export function foraDaTransacaoAtiva<T>(fn: () => T): T {
  return transacaoAtiva.exit(fn);
}
