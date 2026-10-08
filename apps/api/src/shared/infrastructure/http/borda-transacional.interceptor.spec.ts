import { describe, expect, it } from 'vitest';
import { Controller, Get } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { ErroDeDominioException, erroDeDominio } from '../../kernel/erro-de-dominio.js';
import { ehResultadoDeErro, err, ok } from '../../kernel/result.js';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { ContextoDaRequisicaoValor } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { BordaTransacionalInterceptor, MODO_PADRAO_SEM_MARCA } from './borda-transacional.interceptor.js';
import { ModoDeTransacao as ComModoDeTransacao } from './modo-de-transacao.decorator.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';
import { lerCorrelacaoDaRequisicao } from './correlacao-da-requisicao.js';

class UnidadeDeTrabalhoFake extends UnidadeDeTrabalho {
  modosChamados: ModoDeTransacao[] = [];

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.modosChamados.push(modo);
    return fn({} as ContextoDaTransacao);
  }
}

class UnidadeDeTrabalhoQueRegistraSequencia extends UnidadeDeTrabalho {
  readonly eventos: string[] = [];

  async transacao<T>(modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    this.eventos.push(`begin:${modo}`);
    try {
      const resultado = await fn({} as ContextoDaTransacao);
      this.eventos.push(ehResultadoDeErro(resultado) ? 'rollback' : 'commit');
      return resultado;
    } catch (erro) {
      this.eventos.push('rollback');
      throw erro;
    }
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
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

@ComModoDeTransacao('escrita')
@Controller()
class ControladorComMarcaDeClasse {
  @Get()
  heranca(): void {}

  @ComModoDeTransacao('leitura')
  @Get('override')
  comOverride(): void {}
}

function contextoDeExecucaoPara(nomeDoMetodo: 'heranca' | 'comOverride'): ExecutionContext {
  return {
    getHandler: () => ControladorComMarcaDeClasse.prototype[nomeDoMetodo],
    getClass: () => ControladorComMarcaDeClasse,
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('BordaTransacionalInterceptor', () => {
  it('usa o modo padrão de leitura quando a rota não tem @ModoDeTransacao', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(await firstValueFrom(observavel)).toBe('resposta');
    expect(uow.modosChamados).toStrictEqual(['leitura']);
    expect(MODO_PADRAO_SEM_MARCA).toBe('leitura');
  });

  it('herda o modo declarado na classe quando o método não sobrescreve', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucaoPara('heranca'), proximo);

    expect(uow.modosChamados).toStrictEqual(['escrita']);
  });

  it('o modo declarado no método sobrescreve o modo declarado na classe', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucaoPara('comOverride'), proximo);

    expect(uow.modosChamados).toStrictEqual(['leitura']);
  });

  it('publica a identidade do provedor em ContextoDaRequisicao durante o handler', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
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

  it('grava na requisição a mesma correlacaoId publicada em ContextoDaRequisicao', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );

    let contextoObservado: ContextoDaRequisicaoValor | undefined;
    const requisicao = {};
    const contexto = {
      getHandler: () => function handlerQualquer() {},
      getClass: () => class ControladorQualquer {},
      switchToHttp: () => ({ getRequest: () => requisicao }),
    } as unknown as ExecutionContext;
    const proximo: CallHandler = {
      handle: () => {
        contextoObservado = ContextoDaRequisicao.atual();
        return of('resposta');
      },
    };

    await interceptor.intercept(contexto, proximo);

    expect(lerCorrelacaoDaRequisicao(requisicao)).toBe(contextoObservado?.correlacaoId);
  });

  it('não vaza ContextoDaRequisicao para fora do intercept', async () => {
    const uow = new UnidadeDeTrabalhoFake();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({ instituicaoId: 'inst-a' }),
    );
    const proximo: CallHandler = { handle: () => of('resposta') };

    await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(ContextoDaRequisicao.atual()).toBeUndefined();
  });

  it('roda o handler dentro da transação — entre o begin e o commit', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = {
      handle: () => {
        uow.eventos.push('handler');
        return of('resposta');
      },
    };

    await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    expect(uow.eventos).toStrictEqual(['begin:leitura', 'handler', 'commit']);
  });

  it('reverte a transação quando o handler falha, sem gravar o commit', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = {
      handle: () => {
        uow.eventos.push('handler');
        throw new Error('falha proposital');
      },
    };

    await expect(interceptor.intercept(contextoDeExecucaoQualquer(), proximo)).rejects.toThrow(
      'falha proposital',
    );

    expect(uow.eventos).toStrictEqual(['begin:leitura', 'handler', 'rollback']);
  });

  it('handler que devolve Result de erro desfaz a transação e a resposta sai como erro de domínio', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = {
      handle: () => of(err(erroDeDominio('RECURSO_NAO_ENCONTRADO'))),
    };

    const resposta = interceptor.intercept(contextoDeExecucaoQualquer(), proximo);

    await expect(resposta).rejects.toBeInstanceOf(ErroDeDominioException);
    await expect(resposta).rejects.toMatchObject({
      erroDeDominio: { codigo: 'RECURSO_NAO_ENCONTRADO' },
    });
    expect(uow.eventos).toStrictEqual(['begin:leitura', 'rollback']);
  });

  it('handler que devolve Result ok confirma e entrega o valor, sem o envelope', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of(ok({ id: 7 })) };

    const resposta = await firstValueFrom(await interceptor.intercept(contextoDeExecucaoQualquer(), proximo));

    expect(resposta).toStrictEqual({ id: 7 });
    expect(uow.eventos).toStrictEqual(['begin:leitura', 'commit']);
  });

  it('handler que devolve ok sem valor confirma e entrega undefined', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of(ok()) };

    const resposta = await firstValueFrom(await interceptor.intercept(contextoDeExecucaoQualquer(), proximo));

    expect(resposta).toBeUndefined();
    expect(uow.eventos).toStrictEqual(['begin:leitura', 'commit']);
  });

  it.each([
    ['objeto', { id: 7 }],
    ['string', 'resposta'],
    ['objeto com tipo ok mas sem valor', { tipo: 'ok' }],
  ])('handler que devolve %s fora do Result entrega o valor intacto', async (_nome, devolvido) => {
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      new UnidadeDeTrabalhoFake(),
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of(devolvido) };

    const resposta = await firstValueFrom(await interceptor.intercept(contextoDeExecucaoQualquer(), proximo));

    expect(resposta).toStrictEqual(devolvido);
  });

  it('handler que devolve ok com valor nulo entrega null', async () => {
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      new UnidadeDeTrabalhoFake(),
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = { handle: () => of(ok(null)) };

    const resposta = await firstValueFrom(await interceptor.intercept(contextoDeExecucaoQualquer(), proximo));

    expect(resposta).toBeNull();
  });

  it('não deixa nada emitir depois do commit quando o handler emite mais de um valor', async () => {
    const uow = new UnidadeDeTrabalhoQueRegistraSequencia();
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      uow,
      new ProvedorDeContextoDeInstituicaoFixo({}),
    );
    const proximo: CallHandler = {
      handle: () =>
        new Observable<number>((assinante) => {
          assinante.next(1);
          setTimeout(() => {
            uow.eventos.push('emitiu-segundo-valor');
            assinante.next(2);
            assinante.complete();
          }, 5);
        }),
    };

    const observavel = await interceptor.intercept(contextoDeExecucaoQualquer(), proximo);
    await firstValueFrom(observavel);

    expect(uow.eventos.indexOf('emitiu-segundo-valor')).toBeLessThan(uow.eventos.indexOf('commit'));
  });
  it('reusa o correlacaoId já publicado pela correlação da requisição', async () => {
    const interceptor = new BordaTransacionalInterceptor(
      new Reflector(),
      new UnidadeDeTrabalhoFake(),
      new ProvedorDeContextoDeInstituicaoFixo({ instituicaoId: 'inst-a' }),
    );
    let contextoObservado: ContextoDaRequisicaoValor | undefined;
    const proximo: CallHandler = {
      handle: () => {
        contextoObservado = ContextoDaRequisicao.atual();
        return of('resposta');
      },
    };

    await ContextoDaRequisicao.executar({ correlacaoId: 'correlacao-da-borda' }, () =>
      interceptor.intercept(contextoDeExecucaoQualquer(), proximo),
    );

    expect(contextoObservado).toStrictEqual({
      correlacaoId: 'correlacao-da-borda',
      instituicaoId: 'inst-a',
      usuarioId: undefined,
    });
  });
});
