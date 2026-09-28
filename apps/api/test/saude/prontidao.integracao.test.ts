import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS } from '../../src/shared/infrastructure/saude/verificador-de-prontidao.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';

const URL_SEM_POSTGRES = 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd';
const CORPO_DE_INDISPONIVEL = { status: 'indisponivel' };
const FOLGA_DO_TIMEOUT_EM_MS = 1_500;

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
  vi.stubEnv('BANCO_URL', bancoUrl);
  vi.stubEnv('BANCO_POOL_MAXIMO', '2');
  vi.stubEnv('LOG_NIVEL', 'fatal');
  const app = await criarAplicacao();
  await app.listen(0);
  const endereco = app.getHttpServer().address() as AddressInfo;
  return { app, origem: `http://127.0.0.1:${endereco.port}` };
}

async function consultarProntidao(origem: string): Promise<{ status: number; corpo: unknown }> {
  const resposta = await fetch(`${origem}/saude/pronta`);
  return { status: resposta.status, corpo: await resposta.json() };
}

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
      expect(await consultarProntidao(origem)).toStrictEqual({ status: 200, corpo: { status: 'pronta' } });
    });

    it('responde 200 com um evento pendente recente e um evento velho já publicado', async () => {
      await gravarEvento(banco, { ocorridoHa: '4 minutes' });
      await gravarEvento(banco, { ocorridoHa: '1 day', publicado: true, tentativas: 10 });

      expect(await consultarProntidao(origem)).toStrictEqual({ status: 200, corpo: { status: 'pronta' } });
    });

    it('responde 503 com um evento pendente há mais de 5 minutos', async () => {
      await gravarEvento(banco, { ocorridoHa: '6 minutes' });

      expect(await consultarProntidao(origem)).toStrictEqual({ status: 503, corpo: CORPO_DE_INDISPONIVEL });
    });

    it('responde 503 com um evento recente que já esgotou 10 tentativas', async () => {
      await gravarEvento(banco, { ocorridoHa: '1 minute', tentativas: 10 });

      expect(await consultarProntidao(origem)).toStrictEqual({ status: 503, corpo: CORPO_DE_INDISPONIVEL });
    });

    it('volta a 200 quando o evento atrasado é publicado', async () => {
      await gravarEvento(banco, { ocorridoHa: '6 minutes' });
      expect((await consultarProntidao(origem)).status).toBe(503);

      await banco.owner.query('update shared.outbox set publicado_em = now()');

      expect(await consultarProntidao(origem)).toStrictEqual({ status: 200, corpo: { status: 'pronta' } });
    });

    it('responde 503 dentro do timeout curto quando a consulta fica presa num lock', async () => {
      await banco.owner.query('begin');
      await banco.owner.query('lock table shared.outbox in access exclusive mode');
      try {
        const inicio = performance.now();
        const resultado = await consultarProntidao(origem);
        const decorrido = performance.now() - inicio;

        expect(resultado).toStrictEqual({ status: 503, corpo: CORPO_DE_INDISPONIVEL });
        expect(decorrido).toBeLessThan(TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS + FOLGA_DO_TIMEOUT_EM_MS);
      } finally {
        await banco.owner.query('rollback');
      }
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
