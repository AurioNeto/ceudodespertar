import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import type { CallHandler, ExecutionContext, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste, urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { BancoModule } from '../../src/shared/infrastructure/banco/banco.module.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import { IdempotenciaModule } from '../../src/shared/infrastructure/idempotencia/idempotencia.module.js';
import {
  ExpurgoDeChavesDeIdempotencia,
  INTERVALO_DO_EXPURGO_EM_MS,
} from '../../src/shared/infrastructure/idempotencia/expurgo-de-chaves-de-idempotencia.js';
import { IdempotenciaInterceptor } from '../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';
import {
  apagarChavesVencidas,
  consultaDeApagarChavesVencidas,
  reivindicarChave,
} from '../../src/shared/infrastructure/idempotencia/chave-de-idempotencia.repositorio.js';
import type { DadosDaChaveDeIdempotencia } from '../../src/shared/infrastructure/idempotencia/chave-de-idempotencia.repositorio.js';
import { calcularHashDoCorpo } from '../../src/shared/infrastructure/idempotencia/hash-do-corpo.js';
import { comContexto, INSTITUICAO_A, INSTITUICAO_B, semearInstituicoes } from '../eventos/apoio.js';

const VENCIDAS_POR_INSTITUICAO = 3;
const RECENTES_POR_INSTITUICAO = 2;
const CHAVES_NO_ACUMULO = 100_000;
const CHAVES_VENCIDAS_NO_ACUMULO = 50;
const USUARIO = randomUUID();
const ROTA = 'POST /doacoes';
const HASH = calcularHashDoCorpo({ valor: 10 });
const LIMITE_DE_TENTATIVAS_DE_BLOQUEIO = 500;
const INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS = 10;

async function semearChaves(
  banco: BancoDeTeste,
  instituicaoId: string,
  quantidade: number,
  idade: string,
  chave: () => string = () => randomUUID(),
): Promise<string[]> {
  const chaves = Array.from({ length: quantidade }, chave);
  await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [instituicaoId]);
  await banco.owner.query(
    `insert into shared.chave_de_idempotencia
       (instituicao_id, chave, usuario_id, rota, corpo_hash, status_http, resposta, criada_em)
     select $1, c, $2, $3, $4, 200, '{"corpo":{"cpf":"12345678909"},"location":null}'::jsonb, now() - $5::interval
       from unnest($6::text[]) as c`,
    [instituicaoId, USUARIO, ROTA, HASH, idade, chaves],
  );
  return chaves;
}

async function chavesGravadas(banco: BancoDeTeste, instituicaoId: string): Promise<string[]> {
  await banco.owner.query(`select set_config('app.instituicao_id', $1, false)`, [instituicaoId]);
  const { rows } = await banco.owner.query<{ chave: string }>(
    'select chave from shared.chave_de_idempotencia order by chave',
  );
  return rows.map((linha) => linha.chave);
}

function ordenadas(chaves: string[]): string[] {
  return chaves.toSorted();
}

describe('expurgo das chaves de idempotência vencidas contra o banco (Documento 7 §12)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await derrubarBancoDeTeste(banco);
  });

  describe('com o módulo de idempotência montado', () => {
    let app: INestApplicationContext;

    beforeEach(async () => {
      process.env.BANCO_URL = urlDoAppPara(banco);
      process.env.BANCO_POOL_MAXIMO = '5';
      @Module({ imports: [IdempotenciaModule, BancoModule] })
      class ModuloDeTeste {}
      app = await NestFactory.createApplicationContext(ModuloDeTeste, { logger: false, abortOnError: false });
    });

    afterEach(async () => {
      await app.close();
      delete process.env.BANCO_URL;
      delete process.env.BANCO_POOL_MAXIMO;
    });

    it('uma rodada apaga só as vencidas das duas instituições e mantém as recentes', async () => {
      await semearChaves(banco, INSTITUICAO_A, VENCIDAS_POR_INSTITUICAO, '25 hours');
      const recentesA = await semearChaves(banco, INSTITUICAO_A, RECENTES_POR_INSTITUICAO, '23 hours');
      await semearChaves(banco, INSTITUICAO_B, VENCIDAS_POR_INSTITUICAO, '48 hours');
      const recentesB = await semearChaves(banco, INSTITUICAO_B, RECENTES_POR_INSTITUICAO, '1 minute');

      await app.get(ExpurgoDeChavesDeIdempotencia).expurgar();

      expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual(ordenadas(recentesA));
      expect(await chavesGravadas(banco, INSTITUICAO_B)).toStrictEqual(ordenadas(recentesB));
    });

    it('o job está agendado pelo módulo no intervalo do expurgo', async () => {
      const agendamento = vi.spyOn(globalThis, 'setInterval');
      app.get(ExpurgoDeChavesDeIdempotencia).onModuleInit();

      expect(agendamento).toHaveBeenCalledWith(expect.any(Function), INTERVALO_DO_EXPURGO_EM_MS);
      app.get(ExpurgoDeChavesDeIdempotencia).onModuleDestroy();
    });

    it('o disparo do temporizador expurga mesmo agendado de dentro de uma transação e de uma requisição ativas', async () => {
      const agendamento = vi.spyOn(globalThis, 'setInterval');
      const expurgo = app.get(ExpurgoDeChavesDeIdempotencia);
      const unidade = app.get(UnidadeDeTrabalho);
      await semearChaves(banco, INSTITUICAO_A, VENCIDAS_POR_INSTITUICAO, '25 hours');
      const recentes = await semearChaves(banco, INSTITUICAO_A, RECENTES_POR_INSTITUICAO, '1 hour');

      await comContexto(INSTITUICAO_B, () =>
        unidade.transacao('leitura', async () => {
          expurgo.onModuleInit();
          const disparar = agendamento.mock.calls.at(-1)?.[0] as () => void;
          disparar();
        }),
      );
      expurgo.onModuleDestroy();

      await vi.waitFor(async () => expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual(ordenadas(recentes)));
    });
  });

  describe('isolamento por instituição na própria transação', () => {
    let orm: OrmDeTeste;
    let unidade: UnidadeDeTrabalho;

    beforeEach(async () => {
      orm = await abrirOrmDeTeste(banco, 6);
      unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    });

    afterEach(async () => {
      await orm.close(true);
    });

    it('com o contexto de A, o apagar só enxerga e só remove as vencidas de A', async () => {
      const vencidasA = await semearChaves(banco, INSTITUICAO_A, VENCIDAS_POR_INSTITUICAO, '25 hours');
      const vencidasB = await semearChaves(banco, INSTITUICAO_B, VENCIDAS_POR_INSTITUICAO, '25 hours');

      const apagadas = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ kysely }) => apagarChavesVencidas(kysely)),
      );

      expect(apagadas).toBe(vencidasA.length);
      expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual([]);
      expect(await chavesGravadas(banco, INSTITUICAO_B)).toStrictEqual(ordenadas(vencidasB));
    });

    it('sem contexto de instituição o apagar não remove nada (fail-closed da RLS)', async () => {
      const vencidasA = await semearChaves(banco, INSTITUICAO_A, VENCIDAS_POR_INSTITUICAO, '25 hours');
      const vencidasB = await semearChaves(banco, INSTITUICAO_B, VENCIDAS_POR_INSTITUICAO, '25 hours');

      const apagadas = await ContextoDaRequisicao.foraDeQualquerContexto(() =>
        unidade.transacao('escrita', ({ kysely }) => apagarChavesVencidas(kysely)),
      );

      expect(apagadas).toBe(0);
      expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual(ordenadas(vencidasA));
      expect(await chavesGravadas(banco, INSTITUICAO_B)).toStrictEqual(ordenadas(vencidasB));
    });

    it('apaga pelo índice por criação, sem Seq Scan, com 100 mil chaves recentes acumuladas', async () => {
      await semearChaves(banco, INSTITUICAO_A, CHAVES_NO_ACUMULO, '1 hour', (() => {
        let proxima = 0;
        return () => `recente-${(proxima += 1)}`;
      })());
      await semearChaves(banco, INSTITUICAO_A, CHAVES_VENCIDAS_NO_ACUMULO, '30 hours');
      await banco.owner.query('analyze shared.chave_de_idempotencia');

      const { sql, parameters } = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('leitura', async ({ kysely }) => consultaDeApagarChavesVencidas(kysely).compile()),
      );
      await banco.app.query('begin');
      let plano: string;
      try {
        await banco.app.query(`select set_config('app.instituicao_id', $1, true)`, [INSTITUICAO_A]);
        const { rows } = await banco.app.query<Record<string, string>>(`explain (analyze, format text) ${sql}`, [
          ...parameters,
        ]);
        plano = rows.map((linha) => linha['QUERY PLAN']).join('\n');
      } finally {
        await banco.app.query('rollback');
      }

      expect(plano).toContain('chave_de_idempotencia_por_criacao');
      expect(plano).not.toContain('Seq Scan on chave_de_idempotencia');
    }, 60_000);
  });

  describe('corrida entre o expurgo e o reaproveitamento de uma chave vencida', () => {
    let orm: OrmDeTeste;
    let unidade: UnidadeDeTrabalho;
    let interceptor: IdempotenciaInterceptor;

    beforeEach(async () => {
      orm = await abrirOrmDeTeste(banco, 6);
      unidade = new UnidadeDeTrabalhoMikroOrm(orm);
      interceptor = new IdempotenciaInterceptor(unidade);
    });

    afterEach(async () => {
      await orm.close(true);
    });

    async function esperarBackendBloqueado(tentativasRestantes = LIMITE_DE_TENTATIVAS_DE_BLOQUEIO): Promise<void> {
      await banco.owner.query('select pg_stat_clear_snapshot()');
      const { rows } = await banco.owner.query<{ total: number }>(
        `select count(*)::int as total from pg_stat_activity
          where datname = current_database() and pg_blocking_pids(pid) != '{}'`,
      );
      if ((rows[0]?.total ?? 0) > 0) {
        return;
      }
      if (tentativasRestantes <= 0) {
        throw new Error('o reaproveitamento nunca ficou bloqueado esperando o lock da linha da chave');
      }
      await new Promise((resolver) => setTimeout(resolver, INTERVALO_ENTRE_TENTATIVAS_DE_BLOQUEIO_EM_MS));
      return esperarBackendBloqueado(tentativasRestantes - 1);
    }

    function executarPeloInterceptor(chave: string, executarHandler: () => unknown): Promise<unknown> {
      const respostaFake = { statusCode: 201, getHeader: () => undefined, setHeader: () => undefined };
      const contexto = {
        getHandler: () => function handlerQualquer() {},
        getClass: () => class ControladorQualquer {},
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            path: '/doacoes',
            query: {},
            body: { valor: 10 },
            header: (nome: string) => (nome.toLowerCase() === 'idempotency-key' ? chave : undefined),
          }),
          getResponse: () => respostaFake,
        }),
      } as unknown as ExecutionContext;
      const proximo: CallHandler = { handle: () => of(executarHandler()) };
      return ContextoDaRequisicao.executar(
        { correlacaoId: randomUUID(), instituicaoId: INSTITUICAO_A, usuarioId: USUARIO },
        () =>
          unidade.transacao('escrita', async () => firstValueFrom(await interceptor.intercept(contexto, proximo))),
      );
    }

    it('o expurgo apagando a chave no meio do reaproveitamento não derruba o comando nem repete a resposta apagada', async () => {
      const [chave] = await semearChaves(banco, INSTITUICAO_A, 1, '25 hours');
      if (chave === undefined) {
        throw new Error('chave semeada ausente');
      }
      let liberarExpurgo: () => void = () => undefined;
      const expurgoPodeConfirmar = new Promise<void>((resolver) => {
        liberarExpurgo = resolver;
      });
      let expurgoTemOLock: () => void = () => undefined;
      const lockObtido = new Promise<void>((resolver) => {
        expurgoTemOLock = resolver;
      });

      const expurgo = comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async ({ em, kysely }) => {
          await em.execute('select 1 from shared.chave_de_idempotencia where chave = ? for update', [chave]);
          expurgoTemOLock();
          await expurgoPodeConfirmar;
          return apagarChavesVencidas(kysely);
        }),
      );
      await lockObtido;

      let chamadasDoHandler = 0;
      const comando = executarPeloInterceptor(chave, () => {
        chamadasDoHandler += 1;
        return { novo: true };
      });
      await esperarBackendBloqueado();
      liberarExpurgo();

      const [apagadas, resposta] = await Promise.all([expurgo, comando]);

      expect(apagadas).toBe(1);
      expect(chamadasDoHandler).toBe(1);
      expect(resposta).toStrictEqual({ novo: true });
      expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual([chave]);
    });

    it('reaproveitamento confirmado antes do expurgo preserva a linha renovada', async () => {
      const [chave] = await semearChaves(banco, INSTITUICAO_A, 1, '25 hours');
      if (chave === undefined) {
        throw new Error('chave semeada ausente');
      }
      const dados: DadosDaChaveDeIdempotencia = {
        instituicaoId: INSTITUICAO_A,
        usuarioId: USUARIO,
        chave,
        rota: ROTA,
        corpoHash: HASH,
      };
      let liberarReaproveitamento: () => void = () => undefined;
      const podeConfirmar = new Promise<void>((resolver) => {
        liberarReaproveitamento = resolver;
      });
      let reclamou: () => void = () => undefined;
      const jaReclamou = new Promise<void>((resolver) => {
        reclamou = resolver;
      });

      const reaproveitamento = comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', async ({ kysely }) => {
          const existente = await reivindicarChave(kysely, dados);
          reclamou();
          await podeConfirmar;
          return existente;
        }),
      );
      await jaReclamou;
      const expurgo = comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ kysely }) => apagarChavesVencidas(kysely)),
      );
      await esperarBackendBloqueado();
      liberarReaproveitamento();

      const [existente, apagadas] = await Promise.all([reaproveitamento, expurgo]);

      expect(existente).toBeUndefined();
      expect(apagadas).toBe(0);
      expect(await chavesGravadas(banco, INSTITUICAO_A)).toStrictEqual([chave]);
    });
  });
});
