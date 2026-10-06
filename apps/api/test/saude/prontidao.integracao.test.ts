import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/postgresql';
import { afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { NOME_DA_CONEXAO_DA_PRONTIDAO } from '../../src/shared/infrastructure/banco/pool-da-prontidao.js';
import { TETO_DE_TENTATIVAS } from '../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import { VerificadorDeProntidao } from '../../src/shared/infrastructure/saude/verificador-de-prontidao.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';
import { abrirProxyCongelavel } from './proxy-congelavel.js';
import type { ProxyCongelavel } from './proxy-congelavel.js';

const URL_SEM_POSTGRES = 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd';
const CORPO_DE_INDISPONIVEL = { status: 'indisponivel' };
const LIMITE_DA_RESPOSTA_DE_INDISPONIVEL_EM_MS = 2_000;
const POOL_DA_APLICACAO = 2;
const ESPERA_MAXIMA_DO_FETCH_EM_MS = 10_000;

interface EventoDoOutbox {
  readonly ocorridoHa: string;
  readonly tentativas?: number;
  readonly publicado?: boolean;
}

async function gravarEvento(banco: BancoDeTeste, evento: EventoDoOutbox): Promise<void> {
  await banco.owner.query(
    `insert into shared.outbox
       (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, ocorrido_em, tentativas, publicado_em)
     values ($1, $2, 'teste.EventoDeProntidao', 'teste', $3, '{}'::jsonb,
             now() - $4::interval, $5, case when $6 then now() else null end)`,
    [randomUUID(), randomUUID(), randomUUID(), evento.ocorridoHa, evento.tentativas ?? 0, evento.publicado ?? false],
  );
}

async function subirAplicacao(bancoUrl: string): Promise<{ app: INestApplication; origem: string }> {
  vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
  vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
  vi.stubEnv('BANCO_URL', bancoUrl);
  vi.stubEnv('BANCO_POOL_MAXIMO', String(POOL_DA_APLICACAO));
  vi.stubEnv('LOG_NIVEL', 'fatal');
  const app = await criarAplicacao();
  await app.listen(0);
  const endereco = app.getHttpServer().address() as AddressInfo;
  return { app, origem: `http://127.0.0.1:${endereco.port}` };
}

async function consultarProntidao(origem: string): Promise<{ status: number; corpo: unknown }> {
  const resposta = await fetch(`${origem}/saude/pronta`, { signal: AbortSignal.timeout(ESPERA_MAXIMA_DO_FETCH_EM_MS) });
  return { status: resposta.status, corpo: await resposta.json() };
}

async function consultarProntidaoCronometrada(
  origem: string,
): Promise<{ status: number; corpo: unknown; decorrido: number }> {
  const inicio = performance.now();
  const resultado = await consultarProntidao(origem);
  return { ...resultado, decorrido: performance.now() - inicio };
}

async function sondasEsperandoLock(banco: BancoDeTeste): Promise<number> {
  const { rows } = await banco.app.query<{ total: number }>(
    `select count(*)::int as total
       from pg_stat_activity
      where datname = $1 and application_name = $2 and wait_event_type = 'Lock'`,
    [banco.nomeDoBanco, NOME_DA_CONEXAO_DA_PRONTIDAO],
  );
  return rows[0]?.total ?? -1;
}

const PRONTA = { status: 200, corpo: { status: 'pronta' } };
const INDISPONIVEL = { status: 503, corpo: CORPO_DE_INDISPONIVEL };

describe('GET /saude/pronta (Documento 7 §13)', () => {
  describe('com o banco de pé', () => {
    let banco: BancoDeTeste;
    let app: INestApplication;
    let origem: string;

    beforeEach(async () => {
      banco = await criarBancoDeTeste();
      ({ app, origem } = await subirAplicacao(urlDoAppPara(banco)));
    });

    afterEach(async () => {
      await app.close();
      vi.unstubAllEnvs();
      await derrubarBancoDeTeste(banco);
    });

    it('responde 200 com o outbox vazio', async () => {
      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('responde 200 com um evento pendente há 4 min 50 s e um evento velho já publicado', async () => {
      await gravarEvento(banco, { ocorridoHa: '4 minutes 50 seconds' });
      await gravarEvento(banco, { ocorridoHa: '1 day', publicado: true, tentativas: 10 });

      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('responde 503 com um evento pendente há 5 min 10 s', async () => {
      await gravarEvento(banco, { ocorridoHa: '5 minutes 10 seconds' });

      expect(await consultarProntidao(origem)).toStrictEqual(INDISPONIVEL);
    });

    it('responde 200 com um evento recente que tem 9 tentativas', async () => {
      await gravarEvento(banco, { ocorridoHa: '1 minute', tentativas: 9 });

      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('responde 200 com um evento esgotado há um dia, porque evento esgotado é alerta e não prontidão', async () => {
      await gravarEvento(banco, { ocorridoHa: '1 day', tentativas: TETO_DE_TENTATIVAS });

      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('responde 503 por outbox atrasado com um evento ainda sob o teto pendente há 6 min, mesmo ao lado de um esgotado', async () => {
      await gravarEvento(banco, { ocorridoHa: '1 day', tentativas: TETO_DE_TENTATIVAS });
      await gravarEvento(banco, { ocorridoHa: '6 minutes', tentativas: TETO_DE_TENTATIVAS - 1 });

      expect(await consultarProntidao(origem)).toStrictEqual(INDISPONIVEL);
      expect(await app.get(VerificadorDeProntidao).verificar()).toStrictEqual({
        pronta: false,
        motivo: 'outbox-atrasado',
      });
    });

    it('volta a 200 quando o evento atrasado é publicado', async () => {
      await gravarEvento(banco, { ocorridoHa: '6 minutes' });
      expect((await consultarProntidao(origem)).status).toBe(503);

      await banco.owner.query('update shared.outbox set publicado_em = now()');

      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('continua 200 com o pool da aplicação inteiro ocupado', async () => {
      const orm = app.get(MikroORM);
      const ocupacoes = Array.from({ length: POOL_DA_APLICACAO }, () =>
        orm.em.fork().transactional(async (em) => {
          await em.execute('select pg_sleep(2)');
        }),
      );
      try {
        await vi.waitFor(async () => {
          const { rows } = await banco.app.query<{ total: number }>(
            `select count(*)::int as total from pg_stat_activity where datname = $1 and query = 'select pg_sleep(2)'`,
            [banco.nomeDoBanco],
          );
          expect(rows[0]?.total).toBe(POOL_DA_APLICACAO);
        });

        expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
      } finally {
        await Promise.all(ocupacoes);
      }
    });

    it('responde 503 em menos de 2 s quando a consulta fica presa num lock, e o banco cancela a consulta', async () => {
      await banco.owner.query('begin');
      await banco.owner.query('lock table shared.outbox in access exclusive mode');
      try {
        const resultado = await consultarProntidaoCronometrada(origem);

        expect(resultado).toStrictEqual({ ...INDISPONIVEL, decorrido: expect.any(Number) });
        expect(resultado.decorrido).toBeLessThan(LIMITE_DA_RESPOSTA_DE_INDISPONIVEL_EM_MS);
        await vi.waitFor(async () => expect(await sondasEsperandoLock(banco)).toBe(0), { timeout: 1_000 });
      } finally {
        await banco.owner.query('rollback');
      }
    });

    it('a sonda que fica presa no lock aparece esperando no banco enquanto não é cancelada', async () => {
      await banco.owner.query('begin');
      await banco.owner.query('lock table shared.outbox in access exclusive mode');
      try {
        const emAndamento = consultarProntidao(origem);

        await vi.waitFor(async () => expect(await sondasEsperandoLock(banco)).toBe(1), { timeout: 900 });
        expect(await emAndamento).toStrictEqual(INDISPONIVEL);
      } finally {
        await banco.owner.query('rollback');
      }
    });
  });

  describe('com a rede até o banco congelada', () => {
    let banco: BancoDeTeste;
    let proxy: ProxyCongelavel;
    let app: INestApplication;
    let origem: string;

    beforeEach(async () => {
      banco = await criarBancoDeTeste();
      proxy = await abrirProxyCongelavel(inject('hostDoBanco'), inject('portaDoBanco'));
      const url = `postgres://cdd_app:${inject('senhaCddApp')}@127.0.0.1:${proxy.porta}/${banco.nomeDoBanco}`;
      ({ app, origem } = await subirAplicacao(url));
    });

    afterEach(async () => {
      proxy.descongelar();
      await app.close();
      await proxy.fechar();
      vi.unstubAllEnvs();
      await derrubarBancoDeTeste(banco);
    });

    it('responde 503 em menos de 2 s com a conexão da sonda já aberta, e volta a 200 quando a rede volta', async () => {
      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
      proxy.congelar();

      const congelada = await consultarProntidaoCronometrada(origem);

      expect(congelada).toStrictEqual({ ...INDISPONIVEL, decorrido: expect.any(Number) });
      expect(congelada.decorrido).toBeLessThan(LIMITE_DA_RESPOSTA_DE_INDISPONIVEL_EM_MS);
      proxy.descongelar();
      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });

    it('descarta a conexão da sonda que estourou o tempo em vez de devolvê-la ao pool', async () => {
      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
      const conexoesAntesDoCongelamento = proxy.conexoesRecebidas();
      proxy.congelar();
      expect(await consultarProntidao(origem)).toStrictEqual(INDISPONIVEL);
      proxy.descongelar();

      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
      expect(conexoesAntesDoCongelamento).toBe(1);
      expect(proxy.conexoesRecebidas()).toBe(2);
    });

    it('responde 503 em menos de 2 s quando nem a conexão da sonda consegue abrir', async () => {
      proxy.congelar();

      const congelada = await consultarProntidaoCronometrada(origem);

      expect(congelada).toStrictEqual({ ...INDISPONIVEL, decorrido: expect.any(Number) });
      expect(congelada.decorrido).toBeLessThan(LIMITE_DA_RESPOSTA_DE_INDISPONIVEL_EM_MS);
      proxy.descongelar();
      expect(await consultarProntidao(origem)).toStrictEqual(PRONTA);
    });
  });

  describe('com o banco inacessível', () => {
    let app: INestApplication;
    let origem: string;

    beforeEach(async () => {
      ({ app, origem } = await subirAplicacao(URL_SEM_POSTGRES));
    });

    afterEach(async () => {
      await app.close();
      vi.unstubAllEnvs();
    });

    it('a aplicação sobe mesmo assim e a sonda de vida continua 200', async () => {
      const resposta = await fetch(`${origem}/saude/viva`);

      expect(resposta.status).toBe(200);
    });

    it('responde 503 sem expor o erro de conexão', async () => {
      const resposta = await fetch(`${origem}/saude/pronta`);
      const texto = await resposta.text();

      expect(resposta.status).toBe(503);
      expect(JSON.parse(texto)).toStrictEqual(CORPO_DE_INDISPONIVEL);
      expect(texto).not.toMatch(/ECONNREFUSED|127\.0\.0\.1|cdd_app|postgres/i);
    });
  });
});
