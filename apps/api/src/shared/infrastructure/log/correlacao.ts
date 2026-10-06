import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';

export const CABECALHO_DE_CORRELACAO = 'X-Correlacao-Id';

const CABECALHO_DE_CORRELACAO_RECEBIDO = CABECALHO_DE_CORRELACAO.toLowerCase();
const CorrelacaoRecebidaValida = z.uuid();
const correlacaoPorRequisicao = new WeakMap<IncomingMessage, string>();

export function correlacaoIdDoCliente(requisicao: IncomingMessage): string | undefined {
  const bruto = requisicao.headers[CABECALHO_DE_CORRELACAO_RECEBIDO];
  const resultado = CorrelacaoRecebidaValida.safeParse(bruto);
  return resultado.success ? resultado.data.toLowerCase() : undefined;
}

export function correlacaoDaRequisicao(requisicao: IncomingMessage, resposta: ServerResponse): string {
  const jaResolvida = correlacaoPorRequisicao.get(requisicao);
  if (jaResolvida !== undefined) {
    return jaResolvida;
  }
  const correlacaoId = randomUUID();
  correlacaoPorRequisicao.set(requisicao, correlacaoId);
  resposta.setHeader(CABECALHO_DE_CORRELACAO, correlacaoId);
  return correlacaoId;
}

export function middlewareDeCorrelacao(
  requisicao: IncomingMessage,
  resposta: ServerResponse,
  proximo: () => void,
): void {
  const correlacaoId = correlacaoDaRequisicao(requisicao, resposta);
  ContextoDaRequisicao.executar({ correlacaoId }, proximo);
}
