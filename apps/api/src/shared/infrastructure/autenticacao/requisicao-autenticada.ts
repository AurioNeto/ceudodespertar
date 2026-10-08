import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ContextoDeAcesso } from './contexto-de-acesso.js';
import type { IdentidadeAutenticada } from './identidade-autenticada.js';

const IDENTIDADE = Symbol('identidade-autenticada');
const CONTEXTO = Symbol('contexto-de-acesso');

export interface RequisicaoHttp {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  [IDENTIDADE]?: IdentidadeAutenticada;
  [CONTEXTO]?: ContextoDeAcesso;
}

export interface RespostaHttp {
  setHeader(nome: string, valor: string): unknown;
}

export function guardarIdentidade(requisicao: RequisicaoHttp, identidade: IdentidadeAutenticada): void {
  requisicao[IDENTIDADE] = identidade;
}

export function guardarContexto(requisicao: RequisicaoHttp, contexto: ContextoDeAcesso): void {
  requisicao[CONTEXTO] = contexto;
}

export function identidadeDaRequisicao(requisicao: RequisicaoHttp): IdentidadeAutenticada | undefined {
  return requisicao[IDENTIDADE];
}

export function contextoDeAcessoDaRequisicao(requisicao: RequisicaoHttp): ContextoDeAcesso | undefined {
  return requisicao[CONTEXTO];
}

export const IdentidadeAtual = createParamDecorator((_dados: unknown, contexto: ExecutionContext) =>
  identidadeDaRequisicao(contexto.switchToHttp().getRequest<RequisicaoHttp>()),
);

export const ContextoAtual = createParamDecorator((_dados: unknown, contexto: ExecutionContext) =>
  contextoDeAcessoDaRequisicao(contexto.switchToHttp().getRequest<RequisicaoHttp>()),
);
