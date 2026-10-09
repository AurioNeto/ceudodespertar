import { describe, expect, it } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { IdempotenciaInterceptor } from './idempotencia.interceptor.js';
import { ErroDeConfiguracaoDeIdempotencia } from './erro-de-configuracao-de-idempotencia.js';
import { SemIdempotencia } from './sem-idempotencia.decorator.js';

interface RequisicaoFake {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, unknown>;
  readonly body: unknown;
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
    query: {},
    body: {},
    header: (nome: string) => cabecalhos[nome.toLowerCase()],
  };
}

class ControladorComRotaSemIdempotencia {
  @SemIdempotencia()
  rota(): void {}
}

@SemIdempotencia()
class ControladorSemIdempotenciaNaClasse {
  rota(): void {}
}

function contextoDeExecucao(
  requisicao: RequisicaoFake,
  alvo: { handler: Function; controlador: Function } = {
    handler: function handlerQualquer() {},
    controlador: class ControladorQualquer {},
  },
): ExecutionContext {
  return {
    getHandler: () => alvo.handler,
    getClass: () => alvo.controlador,
    switchToHttp: () => ({ getRequest: () => requisicao }),
  } as unknown as ExecutionContext;
}

describe('IdempotenciaInterceptor · casos em que a idempotência não se aplica', () => {
  it('passa direto quando não há cabeçalho Idempotency-Key', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await ContextoDaRequisicao.executar(
      { correlacaoId: 'c1', instituicaoId: 'inst-a' },
      () => interceptor.intercept(contextoDeExecucao(requisicaoFake({})), proximo),
    );

    expect(await import('rxjs').then((m) => m.firstValueFrom(observavel))).toBe('resposta');
  });

  it('passa direto quando o método não é POST', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await ContextoDaRequisicao.executar({ correlacaoId: 'c1', instituicaoId: 'inst-a' }, () =>
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ metodo: 'GET', chave: 'k1' })), proximo),
    );
  });
});

describe('IdempotenciaInterceptor · falha fechada quando a borda não rodou antes', () => {
  it('lança erro de configuração quando não há instituição no contexto da requisição', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await expect(
      ContextoDaRequisicao.executar({ correlacaoId: 'c1' }, () =>
        interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: 'k1' })), proximo),
      ),
    ).rejects.toThrow(ErroDeConfiguracaoDeIdempotencia);
  });

  it('lança erro de configuração quando não há ContextoDaRequisicao nenhum', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await expect(
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: 'k1' })), proximo),
    ).rejects.toThrow(ErroDeConfiguracaoDeIdempotencia);
  });
});

describe('IdempotenciaInterceptor · validação do cabeçalho', () => {
  it('rejeita chave vazia com 400', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    await expect(
      ContextoDaRequisicao.executar({ correlacaoId: 'c1', instituicaoId: 'inst-a' }, () =>
        interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: '' })), proximo),
      ),
    ).rejects.toMatchObject({ status: 400, response: { erro: 'CORPO_INVALIDO' } });
  });

  it('rejeita chave com 9000 caracteres com 400', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };
    const chaveGigante = 'k'.repeat(9000);

    await expect(
      ContextoDaRequisicao.executar({ correlacaoId: 'c1', instituicaoId: 'inst-a' }, () =>
        interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: chaveGigante })), proximo),
      ),
    ).rejects.toMatchObject({ status: 400, response: { erro: 'CORPO_INVALIDO' } });
  });
});

describe('IdempotenciaInterceptor · rota marcada com @SemIdempotencia', () => {
  const alvoNoMetodo = {
    handler: ControladorComRotaSemIdempotencia.prototype.rota,
    controlador: ControladorComRotaSemIdempotencia,
  };
  const alvoNaClasse = {
    handler: ControladorSemIdempotenciaNaClasse.prototype.rota,
    controlador: ControladorSemIdempotenciaNaClasse,
  };

  it.each([
    ['no método', alvoNoMetodo],
    ['na classe', alvoNaClasse],
  ])('ignora a chave sem erro e executa o handler quando a marca está %s e não há instituição', async (_onde, alvo) => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await ContextoDaRequisicao.executar({ correlacaoId: 'c1' }, () =>
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: 'k1' }), alvo), proximo),
    );

    expect(await firstValueFrom(observavel)).toBe('resposta');
  });

  it('ignora a chave mesmo malformada, sem responder 400', async () => {
    const interceptor = new IdempotenciaInterceptor(new UnidadeDeTrabalhoQueNuncaDeveSerChamada());
    const proximo: CallHandler = { handle: () => of('resposta') };

    const observavel = await ContextoDaRequisicao.executar({ correlacaoId: 'c1' }, () =>
      interceptor.intercept(contextoDeExecucao(requisicaoFake({ chave: '' }), alvoNoMetodo), proximo),
    );

    expect(await firstValueFrom(observavel)).toBe('resposta');
  });
});
