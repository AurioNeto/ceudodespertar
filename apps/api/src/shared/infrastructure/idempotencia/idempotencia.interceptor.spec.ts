import { describe, expect, it } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';

interface RequisicaoFake {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly route?: { readonly path?: string };
  header(nome: string): string | undefined;
}

class UnidadeDeTrabalhoQueNuncaDeveSerChamada extends UnidadeDeTrabalho {
  async transacao<T>(_modo: ModoDeTransacao, _fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    throw new Error('a idempotência não deveria abrir transação quando não se aplica');
  }
}

function requisicaoFake(opcoes: { metodo?: string; chave?: string }): RequisicaoFake {
  const cabecalhos: Record<string, string> = {};
  if (opcoes.chave !== undefined) {
    cabecalhos['idempotency-key'] = opcoes.chave;
  }
  return {
    method: opcoes.metodo ?? 'POST',
    path: '/doacoes',
    body: {},
    route: { path: '/doacoes' },
    header: (nome: string) => cabecalhos[nome.toLowerCase()],
  };
}

function contextoDeExecucao(requisicao: RequisicaoFake): ExecutionContext {
  return {
    getHandler: () => function handlerQualquer() {},
    getClass: () => class ControladorQualquer {},
    switchToHttp: () => ({ getRequest: () => requisicao }),
  } as unknown as ExecutionContext;
}

describe('IdempotenciaInterceptor · casos em que a idempotência não se aplica', () => {
  it('passa direto quando não há cabeçalho Idempotency-Key', async () => {
    const interceptor = new IdempotenciaInterceptor(new Reflector(), new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await ContextoDaRequisicao.executar(
      { correlacaoId: 'c1', instituicaoId: 'inst-a' },
      () => interceptor.intercept(contextoDeExecucao(requisicaoFake({})), proximo),
    );

    expect(await import('rxjs').then((m) => m.firstValueFrom(observavel))).toBe('resposta');
  });

  it('passa direto quando o método não é POST', async () => {
    const interceptor = new IdempotenciaInterceptor(new Reflector(), new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await ContextoDaRequisicao.executar({ correlacaoId: 'c1', instituicaoId: 'inst-a' }, () =>
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ metodo: 'GET', chave: 'k1' })), proximo),
    );
  });

  it('passa direto quando não há instituição no contexto da requisição', async () => {
    const interceptor = new IdempotenciaInterceptor(new Reflector(), new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await ContextoDaRequisicao.executar({ correlacaoId: 'c1' }, () =>
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: 'k1' })), proximo),
    );
  });

  it('passa direto quando não há ContextoDaRequisicao nenhum', async () => {
    const interceptor = new IdempotenciaInterceptor(new Reflector(), new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: 'k1' })), proximo);
  });
});
