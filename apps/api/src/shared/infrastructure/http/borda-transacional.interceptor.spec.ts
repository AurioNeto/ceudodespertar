import { describe, expect, it } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { ContextoDaRequisicao } from '../../kernel/contexto-da-requisicao.js';
import type { ContextoDaRequisicaoValor } from '../../kernel/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { BordaTransacionalInterceptor, MODO_PADRAO_SEM_MARCA } from './borda-transacional.interceptor.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';

class UnidadeDeTrabalhoFake extends UnidadeDeTrabalho {
  modosChamados: ModoDeTransacao[] = [];

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modosChamados.push(modo);
    return fn({} as ContextoDaTransacao);
  }
}

class ProvedorDeContextoDeInstituicaoFixo extends ProvedorDeContextoDeInstituicao {
  constructor(private readonly identidade: { instituicaoId?: string; usuarioId?: string }) {
    super();
  }

  identidadeAtual() {
    return this.identidade;
  }
}

function contextoDeExecucaoQualquer(): ExecutionContext {
  return {
    getHandler: () => function handlerQualquer() {},
    getClass: () => class ControladorQualquer {},
  } as unknown as ExecutionContext;
}

function reflectorQueDevolve(valor: ModoDeTransacao | undefined): Reflector {
  return { getAllAndOverride: () => valor } as unknown as Reflector;
}

describe('BordaTransacionalInterceptor', () => {
  it('usa o modo padrão de leitura quando a rota não tem @ModoDeTransacao', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      reflectorQueDevolve(undefined),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(await firstValueFrom(observavel)).toBe('resposta');
    expect(uow.modosChamados).toStrictEqual([MODO_PADRAO_SEM_MARCA]);
  });

  it('usa o modo declarado por @ModoDeTransacao', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      reflectorQueDevolve('escrita'),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(uow.modosChamados).toStrictEqual(['escrita']);
  });

  it('publica a identidade do provedor em ContextoDaRequisicao durante o handler', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      reflectorQueDevolve(undefined),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({ instituicaoId: 'inst-a', usuarioId: 'user-1' }),
    );

    let contextoObservado: ContextoDaRequisicaoValor | undefined;
    const proximo: CallHandler = {
      handle: () => {
        contextoObservado = ContextoDaRequisicao.atual();
        return of('resposta');
      },
    };

    await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(contextoObservado).toMatchObject({ instituicaoId: 'inst-a', usuarioId: 'user-1' });
    expect(contextoObservado?.correlacaoId).toEqual(expect.any(String));
  });

  it('não vaza ContextoDaRequisicao para fora do intercept', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      reflectorQueDevolve(undefined),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({ instituicaoId: 'inst-a' }),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(ContextoDaRequisicao.atual()).toBeUndefined();
  });
});
