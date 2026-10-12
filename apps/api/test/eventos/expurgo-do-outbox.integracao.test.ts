import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnidadeDeTrabalhoMikroOrm } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.mikro-orm.js';
import type { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { ExpurgoDoOutbox } from '../../src/shared/infrastructure/eventos/expurgo-do-outbox.js';
import {
  apagarLoteDeDespachados,
  consultaDeApagarLoteDeDespachados,
  RETENCAO_DOS_DESPACHADOS_EM_DIAS,
  TAMANHO_DO_LOTE_DO_EXPURGO,
} from '../../src/shared/infrastructure/eventos/expurgo-do-outbox.repositorio.js';
import { TETO_DE_TENTATIVAS } from '../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { abrirOrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import type { OrmDeTeste } from '../unidade-de-trabalho/orm-de-teste.js';
import {
  comContexto,
  encerrarContextoDeEventos,
  INSTITUICAO_A,
  INSTITUICAO_B,
  semearInstituicoes,
  subirContextoDeEventos,
} from './apoio.js';

const PASTA_DA_MIGRACAO = join(dirname(fileURLToPath(import.meta.url)), '../../src/banco/migracoes/b0-012-outbox-expurgo');
const SQL_DE_APLICAR = readFileSync(join(PASTA_DA_MIGRACAO, 'expurgo.sql'), 'utf8');
const SQL_DE_DESFAZER = readFileSync(join(PASTA_DA_MIGRACAO, 'desfazer.sql'), 'utf8');
const DEFINICAO_DO_INDICE =
  'CREATE INDEX outbox_despachados_por_instituicao ON shared.outbox USING btree (instituicao_id, publicado_em) WHERE (publicado_em IS NOT NULL)';

const ALEM_DA_RETENCAO = `${RETENCAO_DOS_DESPACHADOS_EM_DIAS + 1} days`;
const DENTRO_DA_RETENCAO = `${RETENCAO_DOS_DESPACHADOS_EM_DIAS - 1} days`;
const BEM_ANTIGO = `${RETENCAO_DOS_DESPACHADOS_EM_DIAS * 3} days`;
const PENDENTES_NO_ACUMULO = 200_000;

type Situacao = 'despachado-antigo' | 'despachado-recente' | 'pendente' | 'esgotado';

async function semear(
  banco: BancoDeTeste,
  instituicaoId: string,
  situacao: Situacao,
  quantidade: number,
  publicadoHa: string = ALEM_DA_RETENCAO,
): Promise<void> {
  const publicadoEm =
    situacao === 'despachado-antigo' ? `now() - '${publicadoHa}'::interval`
    : situacao === 'despachado-recente' ? `now() - '${DENTRO_DA_RETENCAO}'::interval`
    : 'null';
  const tentativas = situacao === 'esgotado' ? TETO_DE_TENTATIVAS : 0;
  await banco.owner.query(
    `insert into shared.outbox
       (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, ocorrido_em, publicado_em, tentativas)
     select gen_random_uuid(), $1, $2, 'A', gen_random_uuid(), '{}'::jsonb, now() - '${BEM_ANTIGO}'::interval,
            ${publicadoEm}, ${tentativas}
       from generate_series(1, $3::int)`,
    [instituicaoId, situacao, quantidade],
  );
}

async function contagemPorSituacao(banco: BancoDeTeste, instituicaoId: string): Promise<Record<string, number>> {
  const { rows } = await banco.owner.query<{ tipo: string; total: number }>(
    'select tipo, count(*)::int as total from shared.outbox where instituicao_id = $1 group by tipo order by tipo',
    [instituicaoId],
  );
  return Object.fromEntries(rows.map(({ tipo, total }) => [tipo, total]));
}

async function semearTodasAsSituacoes(banco: BancoDeTeste, instituicaoId: string): Promise<void> {
  await semear(banco, instituicaoId, 'despachado-antigo', 3);
  await semear(banco, instituicaoId, 'despachado-recente', 2);
  await semear(banco, instituicaoId, 'pendente', 2);
  await semear(banco, instituicaoId, 'esgotado', 2);
}

const SOBREVIVENTES = { 'despachado-recente': 2, esgotado: 2, pendente: 2 };

describe('expurgo dos eventos despachados do outbox contra o banco (issue #43)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await derrubarBancoDeTeste(banco);
  });

  describe('com a unidade de trabalho real', () => {
    let orm: OrmDeTeste;
    let unidade: UnidadeDeTrabalho;

    beforeEach(async () => {
      orm = await abrirOrmDeTeste(banco, 6);
      unidade = new UnidadeDeTrabalhoMikroOrm(orm);
    });

    afterEach(async () => {
      await orm.close(true);
    });

    it('uma rodada apaga só os despachados além da retenção nas duas instituições', async () => {
      await semearTodasAsSituacoes(banco, INSTITUICAO_A);
      await semearTodasAsSituacoes(banco, INSTITUICAO_B);

      await new ExpurgoDoOutbox(unidade, 'api').expurgar();

      expect(await contagemPorSituacao(banco, INSTITUICAO_A)).toStrictEqual(SOBREVIVENTES);
      expect(await contagemPorSituacao(banco, INSTITUICAO_B)).toStrictEqual(SOBREVIVENTES);
    });

    it('esgotado e pendente muito antigos continuam no outbox', async () => {
      await semear(banco, INSTITUICAO_A, 'esgotado', 1);
      await semear(banco, INSTITUICAO_A, 'pendente', 1);

      await new ExpurgoDoOutbox(unidade, 'api').expurgar();

      expect(await contagemPorSituacao(banco, INSTITUICAO_A)).toStrictEqual({ esgotado: 1, pendente: 1 });
    });

    it('o apagar filtra a instituição explicitamente: com o id de A não toca nos eventos de B', async () => {
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 3);
      await semear(banco, INSTITUICAO_B, 'despachado-antigo', 4);

      const apagados = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ kysely }) => apagarLoteDeDespachados(kysely, INSTITUICAO_A)),
      );

      expect(apagados).toBe(3);
      expect(await contagemPorSituacao(banco, INSTITUICAO_A)).toStrictEqual({});
      expect(await contagemPorSituacao(banco, INSTITUICAO_B)).toStrictEqual({ 'despachado-antigo': 4 });
    });

    it('o lote de A não se enche com despachados mais antigos de B', async () => {
      await semear(banco, INSTITUICAO_B, 'despachado-antigo', TAMANHO_DO_LOTE_DO_EXPURGO, BEM_ANTIGO);
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 3);

      const apagados = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ kysely }) => apagarLoteDeDespachados(kysely, INSTITUICAO_A)),
      );

      expect(apagados).toBe(3);
      expect(await contagemPorSituacao(banco, INSTITUICAO_B)).toStrictEqual({
        'despachado-antigo': TAMANHO_DO_LOTE_DO_EXPURGO,
      });
    });

    it('um lote apaga no máximo o tamanho do lote, começando pelos despachados mais antigos', async () => {
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 5);
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', TAMANHO_DO_LOTE_DO_EXPURGO, BEM_ANTIGO);

      const apagados = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('escrita', ({ kysely }) => apagarLoteDeDespachados(kysely, INSTITUICAO_A)),
      );

      expect(apagados).toBe(TAMANHO_DO_LOTE_DO_EXPURGO);
      const { rows } = await banco.owner.query<{ restantes: number; maisAntigoHaDias: number }>(
        `select count(*)::int as restantes,
                floor(extract(epoch from now() - min(publicado_em)) / 86400)::int as "maisAntigoHaDias"
           from shared.outbox`,
      );
      expect(rows[0]).toStrictEqual({ restantes: 5, maisAntigoHaDias: RETENCAO_DOS_DESPACHADOS_EM_DIAS + 1 });
    });

    it('a rodada encadeia lotes até esvaziar o que passou da retenção', async () => {
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 2 * TAMANHO_DO_LOTE_DO_EXPURGO + 7);
      await semear(banco, INSTITUICAO_A, 'despachado-recente', 2);

      await new ExpurgoDoOutbox(unidade, 'api').expurgar();

      expect(await contagemPorSituacao(banco, INSTITUICAO_A)).toStrictEqual({ 'despachado-recente': 2 });
    });

    it('apaga pelo índice dos despachados, sem Seq Scan, com 200 mil pendentes acumulados', async () => {
      await banco.owner.query(
        `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
         select gen_random_uuid(), $1, 'pendente', 'A', gen_random_uuid(), '{}'::jsonb
           from generate_series(1, ${PENDENTES_NO_ACUMULO})`,
        [INSTITUICAO_A],
      );
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 50);
      await banco.owner.query('analyze shared.outbox');

      const { sql, parameters } = await comContexto(INSTITUICAO_A, () =>
        unidade.transacao('leitura', async ({ kysely }) => consultaDeApagarLoteDeDespachados(kysely, INSTITUICAO_A).compile()),
      );
      await banco.app.query('begin');
      let plano: string;
      try {
        const { rows } = await banco.app.query<Record<string, string>>(`explain (analyze, format text) ${sql}`, [
          ...parameters,
        ]);
        plano = rows.map((linha) => linha['QUERY PLAN']).join('\n');
      } finally {
        await banco.app.query('rollback');
      }

      expect(plano).toContain('outbox_despachados_por_instituicao');
      expect(plano).not.toContain('Seq Scan on outbox');
    }, 60_000);
  });

  describe('com o módulo de eventos montado', () => {
    let app: INestApplicationContext;

    beforeEach(async () => {
      app = await subirContextoDeEventos(banco);
    });

    afterEach(async () => {
      await encerrarContextoDeEventos(app);
    });

    it('o expurgo é um provider do módulo de eventos e expurga com o papel da aplicação', async () => {
      await semear(banco, INSTITUICAO_A, 'despachado-antigo', 3);
      await semear(banco, INSTITUICAO_A, 'esgotado', 1);

      await app.get(ExpurgoDoOutbox).expurgar();

      expect(await contagemPorSituacao(banco, INSTITUICAO_A)).toStrictEqual({ esgotado: 1 });
    });
  });

  describe('migração do índice', () => {
    async function definicaoDoIndice(): Promise<string | null> {
      const { rows } = await banco.owner.query<{ definicao: string | null }>(
        `select pg_get_indexdef(to_regclass('shared.outbox_despachados_por_instituicao')) as definicao`,
      );
      return rows[0]?.definicao ?? null;
    }

    it('cria o índice parcial exato, desfazer remove e reaplicar restaura', async () => {
      expect(await definicaoDoIndice()).toBe(DEFINICAO_DO_INDICE);

      await banco.owner.query(SQL_DE_DESFAZER);

      expect(await definicaoDoIndice()).toBeNull();

      await banco.owner.query(SQL_DE_APLICAR);

      expect(await definicaoDoIndice()).toBe(DEFINICAO_DO_INDICE);
    });
  });
});
