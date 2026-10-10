import { randomUUID } from 'node:crypto';
import { ContextoDaRequisicao } from './contexto-da-requisicao.js';

export function emContextoDaInstituicao<T>(instituicaoId: string, fn: () => T): T {
  const correlacaoId = ContextoDaRequisicao.atual()?.correlacaoId ?? randomUUID();
  return ContextoDaRequisicao.executar({ correlacaoId, instituicaoId }, fn);
}
