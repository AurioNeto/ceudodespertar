import { randomUUID } from 'node:crypto';
import { Body, Controller, Module, Next, Post, Req, Res } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR, NestFactory } from '@nestjs/core';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { BordaTransacionalInterceptor } from '../../src/shared/infrastructure/http/borda-transacional.interceptor.js';
import { ProvedorDeContextoDeInstituicao } from '../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.js';
import { ModoDeTransacao } from '../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';
import { FiltroDeErrosModule } from '../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { RespostaSemCorpoNoReplay } from '../../src/shared/infrastructure/idempotencia/resposta-sem-corpo-no-replay.decorator.js';
import { SemIdempotencia } from '../../src/shared/infrastructure/idempotencia/sem-idempotencia.decorator.js';
import { IdempotenciaInterceptor } from '../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import { erroDeDominio } from '../../src/shared/kernel/erro-de-dominio.js';
import { err, ok } from '../../src/shared/kernel/result.js';
import { calcularHashDoCorpo } from '../../src/shared/infrastructure/idempotencia/hash-do-corpo.js';

const INSTITUICAO = 'a0000000-0000-0000-0000-000000000000';
const USUARIO = '11111111-1111-1111-1111-111111111111';
const CABECALHO_DE_CHAVE = 'idempotency-key';
const LIMITE_DE_TENTATIVAS_DE_BLOQUEIO = 500;
const INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS = 10;
const BACKENDS_BLOQUEADOS_NA_CORRIDA = 2;
const STATUS_ACEITO = 202;
const STATUS_CRIADO = 201;
const CPF_DEVOLVIDO = '12345678909';
const TAMANHO_DE_CHAVE_LONGA_DEMAIS = 300;
const STATUS_CHAVE_REUTILIZADA = 422;
const CODIGO_CHAVE_REUTILIZADA = 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA';
const STATUS_PERIODO_FECHADO = 422;
const CODIGO_PERIODO_FECHADO = 'PERIODO_FECHADO';

interface RespostaHttp {
  readonly status: number;
  readonly corpo: string;
  readonly location: string | null;
}

interface RespostaExpress {
  status(codigo: number): { json(corpo: unknown): void };
}

interface RespostaExpressPassthrough {
  status(codigo: number): void;
  setHeader(nome: string, valor: string): void;
}

let banco: BancoDeTeste;
let orm: OrmDeTeste;
let app: INestApplication;
let enderecoBase: string;
let unidade: UnidadeDeTrabalhoMikroOrm;
let chamadasDoHandler = 0;

async function registrarEfeito(): Promise<void> {
  await unidade.transacao('escrita', ({ em }) =>
    em.execute(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       values (gen_random_uuid(), ?, 't', 'a', gen_random_uuid(), '{}'::jsonb)`,
      [INSTITUICAO],
    ),
  );
}

@Controller()
@ModoDeTransacao('escrita')
class ControladorDeProva {
  @Post('simples')
  async simples(@Body() _corpo: unknown) {
    chamadasDoHandler += 1;
    await registrarEfeito();
    return { chamada: chamadasDoHandler };
  }

  @Post('resposta-propria')
  async respostaPropria(@Res() resposta: RespostaExpress) {
    chamadasDoHandler += 1;
    await registrarEfeito();
    resposta.status(201).json({ ok: true });
  }

  @Post('proximo')
  proximo(@Next() proximo: () => void) {
    chamadasDoHandler += 1;
    proximo();
  }

  @Post('passthrough')
  async comPassthrough(@Res({ passthrough: true }) resposta: RespostaExpressPassthrough) {
    chamadasDoHandler += 1;
    await registrarEfeito();
    resposta.status(STATUS_ACEITO);
    resposta.setHeader('Location', `/recursos/${chamadasDoHandler}`);
    return { chamada: chamadasDoHandler };
  }

  @Post('sensivel')
  @RespostaSemCorpoNoReplay()
  async sensivel(@Body() _corpo: unknown, @Res({ passthrough: true }) resposta: RespostaExpressPassthrough) {
    chamadasDoHandler += 1;
    await registrarEfeito();
    resposta.status(STATUS_CRIADO);
    resposta.setHeader('Location', `/pessoas/${chamadasDoHandler}`);
    return { chamada: chamadasDoHandler, cpf: CPF_DEVOLVIDO };
  }

  @Post('sem-idempotencia')
  @SemIdempotencia()
  async semIdempotencia() {
    chamadasDoHandler += 1;
    await registrarEfeito();
    return { chamada: chamadasDoHandler };
  }

  @Post('result-de-erro')
  async resultDeErro() {
    chamadasDoHandler += 1;
    await registrarEfeito();
    return err(erroDeDominio(CODIGO_PERIODO_FECHADO));
  }

  @Post('result-ok')
  async resultOk() {
    chamadasDoHandler += 1;
    await registrarEfeito();
    return ok({ chamada: chamadasDoHandler });
  }

  @Post('eco')
  eco(@Req() requisicao: { query: unknown }) {
    chamadasDoHandler += 1;
    return { query: requisicao.query, chamada: chamadasDoHandler };
  }
}

@Module({
  imports: [FiltroDeErrosModule],
  controllers: [ControladorDeProva],
  providers: [
    { provide: UnidadeDeTrabalho, useFactory: () => unidade },
    {
      provide: ProvedorDeContextoDeInstituicao,
      useValue: { identidadeAtual: () => ({ instituicaoId: INSTITUICAO, usuarioId: USUARIO }) },
    },
    { provide: APP_INTERCEPTOR, useClass: BordaTransacionalInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor },
  ],
})
class ModuloDeProva {}

async function postar(caminho: string, chave: string | undefined, corpo: unknown = {}): Promise<RespostaHttp> {
  const cabecalhos: Record<string, string> = { 'content-type': 'application/json' };
  if (chave !== undefined) {
    cabecalhos[CABECALHO_DE_CHAVE] = chave;
  }
  const resposta = await fetch(enderecoBase + caminho, {
    method: 'POST',
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: await resposta.text(), location: resposta.headers.get('location') };
}

function esperarErroDeChaveReutilizada(resposta: RespostaHttp): void {
  expect(resposta.status).toBe(STATUS_CHAVE_REUTILIZADA);
  const corpo = JSON.parse(resposta.corpo) as { erro: string; correlacaoId: string };
  expect(corpo.erro).toBe(CODIGO_CHAVE_REUTILIZADA);
  expect(corpo.correlacaoId).not.toBe('');
  expect(Object.keys(corpo).toSorted()).toStrictEqual(['correlacaoId', 'erro']);
}

async function contar(tabela: 'shared.outbox' | 'shared.chave_de_idempotencia'): Promise<number> {
  await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [INSTITUICAO]);
  const { rows } = await banco.owner.query<{ total: number }>(`select count(*)::int as total from ${tabela}`);
  return rows[0]?.total ?? 0;
}

async function contarBackendsBloqueados(): Promise<number> {
  await banco.owner.query('select pg_stat_clear_snapshot()');
  const { rows } = await banco.owner.query<{ total: number }>(
    `select count(*)::int as total
       from pg_stat_activity
      where datname = current_database()
        and pg_blocking_pids(pid) != '{}'`,
  );
  return rows[0]?.total ?? 0;
}

async function esperarBackendsBloqueados(
  quantidade: number,
  tentativasRestantes = LIMITE_DE_TENTATIVAS_DE_BLOQUEIO,
): Promise<void> {
  if ((await contarBackendsBloqueados()) >= quantidade) {
    return;
  }
  if (tentativasRestantes <= 0) {
    throw new Error(`os ${quantidade} backends nunca ficaram bloqueados esperando o lock da linha da chave`);
  }
  await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS));
  return esperarBackendsBloqueados(quantidade, tentativasRestantes - 1);
}

async function semearChaveVencida(chave: string, rota: string, corpo: unknown): Promise<void> {
  await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [INSTITUICAO]);
  await banco.owner.query(
    `insert into shared.chave_de_idempotencia
       (instituicao_id, chave, usuario_id, rota, corpo_hash, status_http, resposta, criada_em)
     values ($1, $2, $3, $4, $5, 200, '{"corpo":{"velho":true},"location":null}'::jsonb, now() - interval '25 hours')`,
    [INSTITUICAO, chave, USUARIO, rota, calcularHashDoCorpo(corpo)],
  );
}

describe('IdempotenciaInterceptor sobre HTTP real, com borda e idempotência registradas como em produção', () => {
  beforeAll(async () => {
    banco = await criarBancoDeTeste();
    await banco.owner.query(`insert into shared.instituicao (id, nome) values ($1, 'Casa A')`, [INSTITUICAO]);
    orm = await abrirOrmDeTeste(banco, 6);
    unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    app = await NestFactory.create(ModuloDeProva, { logger: false });
    await app.listen(0);
    const { port } = app.getHttpServer().address() as { port: number };
    enderecoBase = `http://127.0.0.1:${port}`;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    await orm?.close(true);
    await derrubarBancoDeTeste(banco);
  });

  beforeEach(() => {
    chamadasDoHandler = 0;
  });

  describe('handler que responde por conta própria', () => {
    it('@Res sem passthrough com chave dá 500 antes de executar o handler: nenhum efeito e nenhuma chave gravada', async () => {
      const efeitosAntes = await contar('shared.outbox');
      const chavesAntes = await contar('shared.chave_de_idempotencia');

      const resposta = await postar('/resposta-propria', randomUUID());

      expect(resposta.status).toBe(500);
      expect(chamadasDoHandler).toBe(0);
      expect(await contar('shared.outbox')).toBe(efeitosAntes);
      expect(await contar('shared.chave_de_idempotencia')).toBe(chavesAntes);
    });

    it('@Next com chave dá 500 antes de executar o handler', async () => {
      const resposta = await postar('/proximo', randomUUID());

      expect(resposta.status).toBe(500);
      expect(chamadasDoHandler).toBe(0);
    });

    it('@Res sem passthrough com chave continua dando 500 na segunda tentativa, sem efeito', async () => {
      const chave = randomUUID();
      const efeitosAntes = await contar('shared.outbox');

      await postar('/resposta-propria', chave);
      const segunda = await postar('/resposta-propria', chave);

      expect(segunda.status).toBe(500);
      expect(await contar('shared.outbox')).toBe(efeitosAntes);
    });

    it('@Res sem passthrough sem chave responde normalmente e produz o efeito', async () => {
      const efeitosAntes = await contar('shared.outbox');

      const resposta = await postar('/resposta-propria', undefined);

      expect(resposta.status).toBe(201);
      expect(JSON.parse(resposta.corpo)).toStrictEqual({ ok: true });
      await vi.waitFor(async () => expect(await contar('shared.outbox')).toBe(efeitosAntes + 1));
    });

    it('@Res com passthrough e chave funciona e o replay repete status, Location e corpo sem novo efeito', async () => {
      const chave = randomUUID();
      const efeitosAntes = await contar('shared.outbox');

      const primeira = await postar('/passthrough', chave);
      const segunda = await postar('/passthrough', chave);

      expect(primeira.status).toBe(STATUS_ACEITO);
      expect(primeira.location).toBe('/recursos/1');
      expect(segunda).toStrictEqual(primeira);
      expect(chamadasDoHandler).toBe(1);
      expect(await contar('shared.outbox')).toBe(efeitosAntes + 1);
    });
  });

  describe('rota marcada com SemIdempotencia', () => {
    it('ignora a chave: cada chamada executa o handler, produz efeito e nada é gravado em chave_de_idempotencia', async () => {
      const chave = randomUUID();
      const efeitosAntes = await contar('shared.outbox');
      const chavesAntes = await contar('shared.chave_de_idempotencia');

      const primeira = await postar('/sem-idempotencia', chave);
      const segunda = await postar('/sem-idempotencia', chave);

      expect(primeira.status).toBe(201);
      expect(segunda.status).toBe(201);
      expect(chamadasDoHandler).toBe(2);
      expect(await contar('shared.outbox')).toBe(efeitosAntes + 2);
      expect(await contar('shared.chave_de_idempotencia')).toBe(chavesAntes);
    });

    it('ignora até a chave malformada, sem responder 400', async () => {
      const resposta = await postar('/sem-idempotencia', 'k'.repeat(TAMANHO_DE_CHAVE_LONGA_DEMAIS));

      expect(resposta.status).toBe(201);
    });
  });

  describe('rota marcada com RespostaSemCorpoNoReplay', () => {
    async function respostaGravada(chave: string): Promise<unknown> {
      await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [INSTITUICAO]);
      const { rows } = await banco.owner.query<{ resposta: unknown }>(
        'select resposta from shared.chave_de_idempotencia where chave = $1',
        [chave],
      );
      return rows[0]?.resposta;
    }

    it('a primeira chamada responde normalmente, com status, Location e corpo', async () => {
      const primeira = await postar('/sensivel', randomUUID());

      expect(primeira.status).toBe(STATUS_CRIADO);
      expect(primeira.location).toBe('/pessoas/1');
      expect(JSON.parse(primeira.corpo)).toStrictEqual({ chamada: 1, cpf: CPF_DEVOLVIDO });
    });

    it('grava no banco só status e Location, sem o corpo da resposta', async () => {
      const chave = randomUUID();

      await postar('/sensivel', chave);

      const resposta = await respostaGravada(chave);
      expect(resposta).toStrictEqual({ corpo: null, location: '/pessoas/1' });
      expect(JSON.stringify(resposta)).not.toContain(CPF_DEVOLVIDO);
    });

    it('o replay devolve o mesmo status e Location com corpo vazio, sem reexecutar o handler', async () => {
      const chave = randomUUID();

      const primeira = await postar('/sensivel', chave);
      const replay = await postar('/sensivel', chave);

      expect(replay.status).toBe(primeira.status);
      expect(replay.location).toBe(primeira.location);
      expect(replay.corpo).toBe('');
      expect(chamadasDoHandler).toBe(1);
    });

    it('reusar a chave com corpo diferente continua dando 422', async () => {
      const chave = randomUUID();

      await postar('/sensivel', chave, { nome: 'a' });
      const reuso = await postar('/sensivel', chave, { nome: 'b' });

      esperarErroDeChaveReutilizada(reuso);
    });

    it('a rota sem a marca segue repetindo o corpo no replay e guardando-o no banco', async () => {
      const chave = randomUUID();

      const primeira = await postar('/passthrough', chave);
      const replay = await postar('/passthrough', chave);

      expect(replay).toStrictEqual(primeira);
      expect(JSON.parse(replay.corpo)).toStrictEqual({ chamada: 1 });
      expect(await respostaGravada(chave)).toStrictEqual({ corpo: { chamada: 1 }, location: '/recursos/1' });
    });
  });

  describe('handler que devolve Result', () => {
    it('Result de erro com a mesma chave: as duas respostas trazem status e código do catálogo, sem outbox nem chave gravada, e o handler roda duas vezes', async () => {
      const chave = randomUUID();
      const efeitosAntes = await contar('shared.outbox');
      const chavesAntes = await contar('shared.chave_de_idempotencia');

      const primeira = await postar('/result-de-erro', chave);
      const segunda = await postar('/result-de-erro', chave);

      for (const resposta of [primeira, segunda]) {
        expect(resposta.status).toBe(STATUS_PERIODO_FECHADO);
        expect((JSON.parse(resposta.corpo) as { erro: string }).erro).toBe(CODIGO_PERIODO_FECHADO);
      }
      expect(chamadasDoHandler).toBe(2);
      expect(await contar('shared.outbox')).toBe(efeitosAntes);
      expect(await contar('shared.chave_de_idempotencia')).toBe(chavesAntes);
    });

    it('Result ok com chave responde 201 com o valor como corpo e o replay devolve o mesmo corpo sem reexecutar', async () => {
      const chave = randomUUID();
      const efeitosAntes = await contar('shared.outbox');

      const primeira = await postar('/result-ok', chave);
      const replay = await postar('/result-ok', chave);

      expect(primeira.status).toBe(STATUS_CRIADO);
      expect(JSON.parse(primeira.corpo)).toStrictEqual({ chamada: 1 });
      expect(replay).toStrictEqual(primeira);
      expect(chamadasDoHandler).toBe(1);
      expect(await contar('shared.outbox')).toBe(efeitosAntes + 1);
    });
  });

  describe('chave inválida', () => {
    it('chave longa demais dá 400 CORPO_INVALIDO com correlacaoId e não executa o handler', async () => {
      const resposta = await postar('/simples', 'x'.repeat(TAMANHO_DE_CHAVE_LONGA_DEMAIS));

      expect(resposta.status).toBe(400);
      const corpo = JSON.parse(resposta.corpo) as { erro: string; correlacaoId: string };
      expect(corpo.erro).toBe('CORPO_INVALIDO');
      expect(corpo.correlacaoId).not.toBe('');
      expect(chamadasDoHandler).toBe(0);
    });
  });

  describe('corrida na reclamação de chave vencida', () => {
    it('dois POSTs simultâneos sobre a mesma chave vencida executam o handler uma vez e respondem igual', async () => {
      const chave = randomUUID();
      await semearChaveVencida(chave, 'POST /simples', {});
      const efeitosAntes = await contar('shared.outbox');

      await banco.owner.query('begin');
      let respostas: RespostaHttp[];
      try {
        await banco.owner.query('select 1 from shared.chave_de_idempotencia where chave = $1 for update', [chave]);
        const disparos = [postar('/simples', chave), postar('/simples', chave)];
        await esperarBackendsBloqueados(BACKENDS_BLOQUEADOS_NA_CORRIDA);
        await banco.owner.query('rollback');
        respostas = await Promise.all(disparos);
      } catch (erro) {
        await banco.owner.query('rollback');
        throw erro;
      }

      const [primeira, segunda] = respostas as [RespostaHttp, RespostaHttp];
      expect(chamadasDoHandler).toBe(1);
      expect(await contar('shared.outbox')).toBe(efeitosAntes + 1);
      expect(segunda).toStrictEqual(primeira);
      expect(JSON.parse(primeira.corpo)).toStrictEqual({ chamada: 1 });
    });
  });

  describe('normalização da query na rota da chave', () => {
    async function repetirComQuery(primeira: string, segunda: string): Promise<[RespostaHttp, RespostaHttp]> {
      const chave = randomUUID();
      return [await postar(`/eco${primeira}`, chave), await postar(`/eco${segunda}`, chave)];
    }

    it('mais de uma chave de query diferindo dá 422', async () => {
      const [, segunda] = await repetirComQuery('?a=1&b=2', '?a=1&b=3');

      esperarErroDeChaveReutilizada(segunda);
    });

    it('as mesmas chaves em ordem diferente dão replay', async () => {
      const [primeira, segunda] = await repetirComQuery('?a=1&b=2', '?b=2&a=1');

      expect(segunda).toStrictEqual(primeira);
      expect(chamadasDoHandler).toBe(1);
    });

    it('valor repetido em ordem diferente (?a=1&a=2 contra ?a=2&a=1) dá 422', async () => {
      const [, segunda] = await repetirComQuery('?a=1&a=2', '?a=2&a=1');

      esperarErroDeChaveReutilizada(segunda);
    });

    it('valor repetido não colide com um valor único que contém vírgula', async () => {
      const [, segunda] = await repetirComQuery('?a=1&a=2', '?a=1%2C2');

      esperarErroDeChaveReutilizada(segunda);
    });

    it('valor codificado (?a=%26b%3D2) não colide com uma segunda chave (?a=&b=2)', async () => {
      const [, segunda] = await repetirComQuery('?a=%26b%3D2', '?a=&b=2');

      esperarErroDeChaveReutilizada(segunda);
    });
  });
});
