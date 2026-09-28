import { randomUUID } from 'node:crypto';
import { HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { IdempotenciaInterceptor } from '../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';

const INSTITUICAO_A = 'a0000000-0000-0000-0000-000000000000';
const INSTITUICAO_B = 'b0000000-0000-0000-0000-000000000000';
const USUARIO_A = randomUUID();

interface RequisicaoFake {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly route?: { readonly path?: string };
  header(nome: string): string | undefined;
}

function requisicaoFake(opcoes: {
  chave?: string;
  corpo?: unknown;
  caminho?: string;
}): RequisicaoFake {
  const cabecalhos: Record<string, string> = {};
  if (opcoes.chave !== undefined) {
    cabecalhos['idempotency-key'] = opcoes.chave;
  }
  return {
    method: 'POST',
    path: opcoes.caminho ?? '/doacoes',
    body: opcoes.corpo ?? { valor: 10 },
    route: { path: opcoes.caminho ?? '/doacoes' },
    header: (nome: string) => cabecalhos[nome.toLowerCase()],
  };
}

class ControladorComHttpCodeExplicito {
  @Post()
  @HttpCode(HttpStatus.OK)
  criar(): void {}
}

function contextoDeExecucao(requisicao: RequisicaoFake, handler: () => void = function handler() {}): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class ControladorQualquer {},
    switchToHttp: () => ({ getRequest: () => requisicao }),
  } as unknown as ExecutionContext;
}

function comIdentidade<T>(instituicaoId: string, fn: () => Promise<T>): Promise<T> {
  return ContextoDaRequisicao.executar(
    { correlacaoId: randomUUID(), instituicaoId, usuarioId: USUARIO_A },
    fn,
  );
}

async function semearInstituicoes(banco: BancoDeTeste): Promise<void> {
  await banco.owner.query('insert into shared.instituicao (id, nome) values ($1, $2), ($3, $4)', [
    INSTITUICAO_A,
    'Casa A',
    INSTITUICAO_B,
    'Casa B',
  ]);
}

describe('IdempotenciaInterceptor · Idempotency-Key (Documento 7 §12)', () => {
  let banco: BancoDeTeste;
  let orm: OrmDeTeste;
  let unidade: UnidadeDeTrabalho;
  let interceptor: IdempotenciaInterceptor;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    orm = await abrirOrmDeTeste(banco, 5);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    interceptor = new IdempotenciaInterceptor(new Reflector(), unidade);
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function executarComando(
    instituicaoId: string,
    requisicao: RequisicaoFake,
    executarHandler: () => unknown,
    handlerMetodo?: () => void,
  ): Promise<unknown> {
    return comIdentidade(instituicaoId, () =>
      unidade.transacao('escrita', async () => {
        const observavel = await interceptor.intercept(
          contextoDeExecucao(requisicao, handlerMetodo),
          { handle: () => of(executarHandler()) } as CallHandler,
        );
        const { firstValueFrom } = await import('rxjs');
        return firstValueFrom(observavel);
      }),
    );
  }

  it('a mesma chave repetida devolve a mesma resposta sem reexecutar o comando', async () => {
    const chave = randomUUID();
    let chamadas = 0;
    const rodar = () => executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { id: chamadas };
    });

    const primeira = await rodar();
    const segunda = await rodar();

    expect(primeira).toStrictEqual({ id: 1 });
    expect(segunda).toStrictEqual({ id: 1 });
    expect(chamadas).toBe(1);
  });

  it('duplo toque concorrente dá um efeito só, com respostas iguais', async () => {
    const chave = randomUUID();
    let chamadas = 0;
    const executarHandlerLento = () => {
      chamadas += 1;
      const numeroDaChamada = chamadas;
      return new Promise((resolver) => setTimeout(() => resolver({ numeroDaChamada }), 50));
    };

    const [primeira, segunda] = await Promise.all([
      executarComando(INSTITUICAO_A, requisicaoFake({ chave }), executarHandlerLento),
      executarComando(INSTITUICAO_A, requisicaoFake({ chave }), executarHandlerLento),
    ]);

    expect(chamadas).toBe(1);
    expect(primeira).toStrictEqual(segunda);
  });

  it('a mesma chave numa rota diferente dá 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA', async () => {
    const chave = randomUUID();
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave, caminho: '/doacoes' }), () => ({ ok: true }));

    await expect(
      executarComando(INSTITUICAO_A, requisicaoFake({ chave, caminho: '/despesas' }), () => ({ ok: true })),
    ).rejects.toMatchObject({
      status: 422,
      response: { erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' },
    });
  });

  it('a mesma chave com corpo diferente dá 422 CHAVE_DE_IDEMPOTENCIA_REUTILIZADA', async () => {
    const chave = randomUUID();
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave, corpo: { valor: 10 } }), () => ({ ok: true }));

    await expect(
      executarComando(INSTITUICAO_A, requisicaoFake({ chave, corpo: { valor: 20 } }), () => ({ ok: true })),
    ).rejects.toMatchObject({
      status: 422,
      response: { erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' },
    });
  });

  it('rollback do comando não deixa a chave gravada', async () => {
    const chave = randomUUID();

    await expect(
      executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
        throw new Error('falha proposital do comando');
      }),
    ).rejects.toThrow('falha proposital do comando');

    const linhas = await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ chave: string }[]>('select chave from shared.chave_de_idempotencia where chave = ?', [chave]),
      ),
    );
    expect(linhas).toHaveLength(0);
  });

  it('a instituição A não vê a chave de B: a mesma chave literal em B roda de novo', async () => {
    const chave = randomUUID();
    let chamadas = 0;
    const executarHandler = () => {
      chamadas += 1;
      return { instituicao: chamadas };
    };

    const respostaDeA = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), executarHandler);
    const respostaDeB = await executarComando(INSTITUICAO_B, requisicaoFake({ chave }), executarHandler);

    expect(chamadas).toBe(2);
    expect(respostaDeA).not.toStrictEqual(respostaDeB);
  });

  it('grava o status HTTP declarado por @HttpCode em vez do padrão de POST', async () => {
    const chave = randomUUID();
    await executarComando(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      () => ({ ok: true }),
      ControladorComHttpCodeExplicito.prototype.criar,
    );

    const linhas = await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ status_http: number }[]>(
          'select status_http from shared.chave_de_idempotencia where chave = ?',
          [chave],
        ),
      ),
    );
    expect(linhas[0]?.status_http).toBe(HttpStatus.OK);
  });

  it('reclama uma chave vencida havia mais de 24h e roda o comando de novo', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, '/doacoes', 'hash-antigo', 200, '{"velho":true}'::jsonb, now() - interval '25 hours')`,
          [INSTITUICAO_A, chave],
        ),
      ),
    );

    let chamadas = 0;
    const resposta = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { novo: true };
    });

    expect(chamadas).toBe(1);
    expect(resposta).toStrictEqual({ novo: true });
  });
});
