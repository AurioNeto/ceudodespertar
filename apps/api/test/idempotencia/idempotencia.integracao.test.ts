import { randomUUID } from 'node:crypto';
import { HttpStatus } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import {
  ErroDeModoDeTransacaoIncompativel,
  UnidadeDeTrabalhoMikroOrm,
} from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { IdempotenciaInterceptor } from '../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { ErroDeConfiguracaoDeIdempotencia } from '../../src/shared/infrastructure/idempotencia/erro-de-configuracao-de-idempotencia.js';
import { calcularHashDoCorpo } from '../../src/shared/infrastructure/idempotencia/hash-do-corpo.js';
import { reclamarChaveVencida } from '../../src/shared/infrastructure/idempotencia/chave-de-idempotencia.repositorio.js';
import type { DadosDaChaveDeIdempotencia } from '../../src/shared/infrastructure/idempotencia/chave-de-idempotencia.repositorio.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';

const INSTITUICAO_A = 'a0000000-0000-0000-0000-000000000000';
const INSTITUICAO_B = 'b0000000-0000-0000-0000-000000000000';
const USUARIO_A = randomUUID();
const HASH_DO_CORPO_PADRAO = calcularHashDoCorpo({ valor: 10 });

interface RequisicaoFake {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, unknown>;
  readonly body: unknown;
  header(nome: string): string | undefined;
}

interface RespostaFake {
  statusCode: number;
  headersSent: boolean;
  getHeader(nome: string): string | undefined;
  setHeader(nome: string, valor: string): void;
}

function respostaFake(statusCodeInicial = HttpStatus.CREATED): RespostaFake {
  const cabecalhos: Record<string, string> = {};
  return {
    statusCode: statusCodeInicial,
    headersSent: false,
    getHeader: (nome: string) => cabecalhos[nome],
    setHeader: (nome: string, valor: string) => {
      cabecalhos[nome] = valor;
    },
  };
}

function requisicaoFake(opcoes: {
  chave?: string;
  corpo?: unknown;
  caminho?: string;
  query?: Record<string, unknown>;
}): RequisicaoFake {
  const cabecalhos: Record<string, string> = {};
  if (opcoes.chave !== undefined) {
    cabecalhos['idempotency-key'] = opcoes.chave;
  }
  return {
    method: 'POST',
    path: opcoes.caminho ?? '/doacoes',
    query: opcoes.query ?? {},
    body: opcoes.corpo ?? { valor: 10 },
    header: (nome: string) => cabecalhos[nome.toLowerCase()],
  };
}

function contextoDeExecucao(requisicao: RequisicaoFake, resposta: RespostaFake = respostaFake()): ExecutionContext {
  return {
    getHandler: () => function handlerQualquer() {},
    getClass: () => class ControladorQualquer {},
    switchToHttp: () => ({ getRequest: () => requisicao, getResponse: () => resposta }),
  } as unknown as ExecutionContext;
}

function comIdentidade<T>(
  instituicaoId: string,
  fn: () => Promise<T>,
  usuarioId: string | undefined = USUARIO_A,
): Promise<T> {
  return ContextoDaRequisicao.executar(
    { correlacaoId: randomUUID(), instituicaoId, usuarioId },
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

interface Barreira {
  readonly promessa: Promise<void>;
  liberar(): void;
}

function criarBarreira(): Barreira {
  let liberar: () => void = () => {};
  const promessa = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  return { promessa, liberar };
}

function criarSinal(): { promessa: Promise<void>; emitir(): void } {
  let emitir: () => void = () => {};
  const promessa = new Promise<void>((resolver) => {
    emitir = resolver;
  });
  return { promessa, emitir };
}

const LIMITE_DE_TENTATIVAS_DE_BLOQUEIO = 300;
const INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS = 10;

async function haAlgumBackendBloqueado(owner: BancoDeTeste['owner']): Promise<boolean> {
  const { rows } = await owner.query<{ total: number }>(
    `select count(*)::int as total
       from pg_stat_activity
      where datname = current_database()
        and pg_blocking_pids(pid) != '{}'`,
  );
  return (rows[0]?.total ?? 0) > 0;
}

async function esperarBloqueioNaLinhaDaChave(
  owner: BancoDeTeste['owner'],
  tentativasRestantes = LIMITE_DE_TENTATIVAS_DE_BLOQUEIO,
): Promise<void> {
  if (await haAlgumBackendBloqueado(owner)) {
    return;
  }
  if (tentativasRestantes <= 0) {
    throw new Error('a segunda reclamação nunca ficou bloqueada esperando o lock da linha da chave');
  }
  await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS));
  return esperarBloqueioNaLinhaDaChave(owner, tentativasRestantes - 1);
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
    interceptor = new IdempotenciaInterceptor(unidade);
  });

  afterEach(async () => {
    await orm.close(true);
    await derrubarBancoDeTeste(banco);
  });

  function executarInterceptor(
    instituicaoId: string,
    requisicao: RequisicaoFake,
    callHandler: CallHandler,
    resposta: RespostaFake = respostaFake(),
    usuarioId: string | undefined = USUARIO_A,
  ): Promise<unknown> {
    return comIdentidade(
      instituicaoId,
      () =>
        unidade.transacao('escrita', async () => {
          const observavel = await interceptor.intercept(contextoDeExecucao(requisicao, resposta), callHandler);
          return firstValueFrom(observavel);
        }),
      usuarioId,
    );
  }

  function executarComando(
    instituicaoId: string,
    requisicao: RequisicaoFake,
    executarHandler: () => unknown,
    resposta: RespostaFake = respostaFake(),
  ): Promise<unknown> {
    return executarInterceptor(instituicaoId, requisicao, { handle: () => of(executarHandler()) }, resposta);
  }

  async function selecionarLinha(instituicaoId: string, chave: string): Promise<{
    rota: string;
    corpo_hash: string | null;
    status_http: number;
    usuario_id: string | null;
    criada_em: Date;
    resposta: { corpo: unknown; location: string | null };
  }> {
    const linhas = await comIdentidade(instituicaoId, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<
          {
            rota: string;
            corpo_hash: string | null;
            status_http: number;
            usuario_id: string | null;
            criada_em: Date;
            resposta: { corpo: unknown; location: string | null };
          }[]
        >(
          'select rota, corpo_hash, status_http, usuario_id, criada_em, resposta from shared.chave_de_idempotencia where instituicao_id = ? and chave = ?',
          [instituicaoId, chave],
        ),
      ),
    );
    const linha = linhas[0];
    if (linha === undefined) {
      throw new Error('linha esperada não encontrada em shared.chave_de_idempotencia');
    }
    return linha;
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

  it('a mesma chave em dois recursos do mesmo padrão de rota dá 422 (usa o caminho concreto, não o padrão)', async () => {
    const chave = randomUUID();
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave, caminho: '/g/1/membros' }), () => ({ ok: true }));

    await expect(
      executarComando(INSTITUICAO_A, requisicaoFake({ chave, caminho: '/g/2/membros' }), () => ({ ok: true })),
    ).rejects.toMatchObject({
      status: 422,
      response: { erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' },
    });
  });

  it('a mesma chave com query string diferente dá 422 (rota inclui a query normalizada)', async () => {
    const chave = randomUUID();
    await executarComando(
      INSTITUICAO_A,
      requisicaoFake({ chave, caminho: '/q', query: { v: '1' } }),
      () => ({ ok: true }),
    );

    await expect(
      executarComando(
        INSTITUICAO_A,
        requisicaoFake({ chave, caminho: '/q', query: { v: '2' } }),
        () => ({ ok: true }),
      ),
    ).rejects.toMatchObject({
      status: 422,
      response: { erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA' },
    });
  });

  it('a mesma chave com os mesmos parâmetros de query em ordem diferente dá replay (rota normaliza a ordem)', async () => {
    const chave = randomUUID();
    let chamadas = 0;
    const rodar = (query: Record<string, unknown>) =>
      executarComando(INSTITUICAO_A, requisicaoFake({ chave, caminho: '/q', query }), () => {
        chamadas += 1;
        return { id: chamadas };
      });

    const primeira = await rodar({ a: '1', b: '2' });
    const segunda = await rodar({ b: '2', a: '1' });

    expect(primeira).toStrictEqual({ id: 1 });
    expect(segunda).toStrictEqual({ id: 1 });
    expect(chamadas).toBe(1);
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

  it('outro usuário na mesma instituição com a mesma chave dá 422, não replay', async () => {
    const chave = randomUUID();
    const outroUsuario = randomUUID();
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => ({ ok: true }));

    await expect(
      executarInterceptor(
        INSTITUICAO_A,
        requisicaoFake({ chave }),
        { handle: () => of({ ok: true }) },
        respostaFake(),
        outroUsuario,
      ),
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

  it('handler que responde por conta própria (@Res sem passthrough) falha fechado e não grava a chave', async () => {
    const chave = randomUUID();
    const resposta = respostaFake();

    await expect(
      executarComando(
        INSTITUICAO_A,
        requisicaoFake({ chave }),
        () => {
          resposta.headersSent = true;
          return undefined;
        },
        resposta,
      ),
    ).rejects.toThrow(ErroDeConfiguracaoDeIdempotencia);

    const linhas = await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('leitura', ({ em }) =>
        em.execute<{ chave: string }[]>('select chave from shared.chave_de_idempotencia where chave = ?', [chave]),
      ),
    );
    expect(linhas).toHaveLength(0);
  });

  it('depois da falha fechada por @Res, uma nova tentativa com a mesma chave roda o handler de novo (o replay não fica pendurado)', async () => {
    const chave = randomUUID();
    const respostaQueResponde = respostaFake();

    await expect(
      executarComando(
        INSTITUICAO_A,
        requisicaoFake({ chave }),
        () => {
          respostaQueResponde.headersSent = true;
          return undefined;
        },
        respostaQueResponde,
      ),
    ).rejects.toThrow(ErroDeConfiguracaoDeIdempotencia);

    let chamadas = 0;
    const resposta = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { ok: true };
    });

    expect(chamadas).toBe(1);
    expect(resposta).toStrictEqual({ ok: true });
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

  it('grava a resposta de uma chave sem afetar outra chave da mesma instituição', async () => {
    const chaveX = randomUUID();
    const chaveY = randomUUID();

    await executarComando(INSTITUICAO_A, requisicaoFake({ chave: chaveX }), () => ({ quem: 'x' }));
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave: chaveY }), () => ({ quem: 'y' }));

    const linhaX = await selecionarLinha(INSTITUICAO_A, chaveX);
    const linhaY = await selecionarLinha(INSTITUICAO_A, chaveY);

    expect(linhaX.resposta.corpo).toStrictEqual({ quem: 'x' });
    expect(linhaY.resposta.corpo).toStrictEqual({ quem: 'y' });
  });

  it('grava o usuario_id de quem reivindicou a chave', async () => {
    const chave = randomUUID();
    await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => ({ ok: true }));

    const linha = await selecionarLinha(INSTITUICAO_A, chave);
    expect(linha.usuario_id).toBe(USUARIO_A);
  });

  it('grava o status HTTP real observado no objeto de resposta', async () => {
    const chave = randomUUID();
    await executarComando(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      () => ({ ok: true }),
      respostaFake(HttpStatus.OK),
    );

    const linha = await selecionarLinha(INSTITUICAO_A, chave);
    expect(linha.status_http).toBe(HttpStatus.OK);
  });

  it('replay fiel: repete o status HTTP definido dinamicamente pelo handler (@Res passthrough)', async () => {
    const chave = randomUUID();
    const respostaOriginal = respostaFake(HttpStatus.CREATED);
    const respostaDoReplay = respostaFake(HttpStatus.CREATED);

    const primeira = await executarInterceptor(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      {
        handle: () => {
          respostaOriginal.statusCode = HttpStatus.ACCEPTED;
          return of({ aceito: true });
        },
      },
      respostaOriginal,
    );

    const segunda = await executarInterceptor(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      { handle: () => of({ aceito: 'nao deveria rodar' }) },
      respostaDoReplay,
    );

    expect(primeira).toStrictEqual({ aceito: true });
    expect(segunda).toStrictEqual({ aceito: true });
    expect(respostaDoReplay.statusCode).toBe(HttpStatus.ACCEPTED);
  });

  it('replay fiel: repete o cabeçalho Location gravado na primeira chamada', async () => {
    const chave = randomUUID();
    const respostaOriginal = respostaFake(HttpStatus.CREATED);
    const respostaDoReplay = respostaFake(HttpStatus.CREATED);

    const primeira = await executarInterceptor(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      {
        handle: () => {
          respostaOriginal.setHeader('Location', '/doacoes/1');
          return of({ id: '1' });
        },
      },
      respostaOriginal,
    );

    const segunda = await executarInterceptor(
      INSTITUICAO_A,
      requisicaoFake({ chave }),
      { handle: () => of({ id: 'nao-deveria-rodar' }) },
      respostaDoReplay,
    );

    expect(primeira).toStrictEqual({ id: '1' });
    expect(segunda).toStrictEqual({ id: '1' });
    expect(respostaDoReplay.getHeader('Location')).toBe('/doacoes/1');
  });

  it('borda em modo leitura mais idempotência (que pede escrita) dá ErroDeModoDeTransacaoIncompativel', async () => {
    const chave = randomUUID();

    await expect(
      comIdentidade(INSTITUICAO_A, () =>
        unidade.transacao('leitura', async () => {
          const observavel = await interceptor.intercept(
            contextoDeExecucao(requisicaoFake({ chave })),
            { handle: () => of({ ok: true }) },
          );
          return firstValueFrom(observavel);
        }),
      ),
    ).rejects.toThrow(ErroDeModoDeTransacaoIncompativel);
  });

  it('reclama uma chave vencida havia mais de 24h e roda o comando de novo', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, '/doacoes', 'hash-antigo', 200, '{"corpo":{"velho":true},"location":null}'::jsonb, now() - interval '25 hours')`,
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

  it('chave com menos de 24h (23h59m59s) ainda não vencida: repete a resposta gravada', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, usuario_id, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, ?, 'POST /doacoes', ?, 200, '{"corpo":{"velho":true},"location":null}'::jsonb,
                   now() - interval '23 hours 59 minutes 59 seconds')`,
          [INSTITUICAO_A, chave, USUARIO_A, HASH_DO_CORPO_PADRAO],
        ),
      ),
    );

    let chamadas = 0;
    const resposta = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { novo: true };
    });

    expect(chamadas).toBe(0);
    expect(resposta).toStrictEqual({ velho: true });
  });

  it('chave vencida há pouco mais de 24h (24h e 1s) reclama e roda de novo', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, 'POST /doacoes', ?, 200, '{"corpo":{"velho":true},"location":null}'::jsonb,
                   now() - interval '24 hours 1 second')`,
          [INSTITUICAO_A, chave, HASH_DO_CORPO_PADRAO],
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

  it('reclamação concorrente da mesma chave vencida dá um efeito só', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, 'POST /doacoes', ?, 200, '{"corpo":{"velho":true},"location":null}'::jsonb, now() - interval '25 hours')`,
          [INSTITUICAO_A, chave, HASH_DO_CORPO_PADRAO],
        ),
      ),
    );

    const dados: DadosDaChaveDeIdempotencia = {
      instituicaoId: INSTITUICAO_A,
      usuarioId: USUARIO_A,
      chave,
      rota: 'POST /doacoes',
      corpoHash: HASH_DO_CORPO_PADRAO,
    };

    const barreiraDaPrimeira = criarBarreira();
    const sinalDaPrimeiraPronta = criarSinal();

    const primeira = comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', async ({ em }) => {
        const reclamou = await reclamarChaveVencida(em, dados);
        sinalDaPrimeiraPronta.emitir();
        await barreiraDaPrimeira.promessa;
        return reclamou;
      }),
    );

    await sinalDaPrimeiraPronta.promessa;

    const segunda = comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) => reclamarChaveVencida(em, dados)),
    );

    await esperarBloqueioNaLinhaDaChave(banco.owner);
    barreiraDaPrimeira.liberar();

    const [reclamouPrimeira, reclamouSegunda] = await Promise.all([primeira, segunda]);

    expect(reclamouPrimeira).toBe(true);
    expect(reclamouSegunda).toBe(false);
  });

  it('depois de reclamar a chave vencida, uma terceira chamada repete a resposta nova (não a antiga)', async () => {
    const chave = randomUUID();
    await comIdentidade(INSTITUICAO_A, () =>
      unidade.transacao('escrita', ({ em }) =>
        em.execute(
          `insert into shared.chave_de_idempotencia
             (instituicao_id, chave, rota, corpo_hash, status_http, resposta, criada_em)
           values (?, ?, 'POST /rota-velha', 'hash-velho', 200, '{"corpo":{"velho":true},"location":null}'::jsonb, now() - interval '25 hours')`,
          [INSTITUICAO_A, chave],
        ),
      ),
    );

    let chamadas = 0;
    const primeira = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { novo: true };
    });
    const segunda = await executarComando(INSTITUICAO_A, requisicaoFake({ chave }), () => {
      chamadas += 1;
      return { deveria: 'nao rodar' };
    });

    const linha = await selecionarLinha(INSTITUICAO_A, chave);

    expect(chamadas).toBe(1);
    expect(primeira).toStrictEqual({ novo: true });
    expect(segunda).toStrictEqual({ novo: true });
    expect(linha.rota).toBe('POST /doacoes');
    expect(linha.corpo_hash).not.toBe('hash-velho');
    expect(Date.now() - new Date(linha.criada_em).getTime()).toBeLessThan(60_000);
  });
});
