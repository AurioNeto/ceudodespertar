import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Injectable, Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ReageA } from '../../src/shared/infrastructure/eventos/reage-a.decorator.js';
import { TETO_DE_TENTATIVAS } from '../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import {
  CONSULTA_DOS_EVENTOS_ESGOTADOS,
  MARCACAO_DOS_NOVOS_ESGOTADOS,
  MENSAGEM_DE_EVENTOS_ESGOTADOS,
  MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO,
  VigiaDeEventosEsgotados,
} from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import {
  INSTITUICAO_A,
  criarEvento,
  encerrarContextoDeEventos,
  gravarEvento,
  semearInstituicoes,
  subirContextoDeEventos,
} from './apoio.js';

const EVENTOS_PENDENTES_NO_ACUMULO = 200_000;
const TIPO_QUE_FALHA = 'teste.EventoQueEsgota';
const PASTA_DA_MIGRACAO = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/banco/migracoes/b0-013-outbox-alertado-em',
);
const SQL_DE_APLICAR = readFileSync(join(PASTA_DA_MIGRACAO, 'alertado-em.sql'), 'utf8');
const SQL_DE_DESFAZER = readFileSync(join(PASTA_DA_MIGRACAO, 'desfazer.sql'), 'utf8');

@Injectable()
class ConsumidorQueSempreFalha {
  @ReageA(TIPO_QUE_FALHA, 'ConsumidorQueSempreFalha.reagir')
  async reagir(): Promise<void> {
    throw new Error('falha proposital do consumidor');
  }
}
const EVENTOS_ESGOTADOS = 3;

async function gravarEsgotados(banco: BancoDeTeste, quantidade: number, ocorridoHa: string): Promise<void> {
  await banco.owner.query(
    `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, tentativas, ocorrido_em)
     select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb, ${TETO_DE_TENTATIVAS}, now() - $2::interval
     from generate_series(1, $3::int)`,
    [INSTITUICAO_A, ocorridoHa, quantidade],
  );
}

describe('vigia de eventos esgotados contra o banco (Documento 7 §13, runbook "Evento esgotado")', () => {
  let banco: BancoDeTeste;
  let app: INestApplicationContext;

  beforeEach(async () => {
    vi.stubEnv('CDD_PROCESSO', 'cli');
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    app = await subirContextoDeEventos(banco);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await encerrarContextoDeEventos(app);
    await derrubarBancoDeTeste(banco);
    vi.unstubAllEnvs();
  });

  async function eventosDe(quantidade: number, ocorridoHa: string): Promise<string[]> {
    const { rows } = await banco.owner.query<{ evento_id: string }>(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, tentativas, ocorrido_em)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb, ${TETO_DE_TENTATIVAS}, now() - $2::interval
       from generate_series(1, $3::int)
       returning evento_id`,
      [INSTITUICAO_A, ocorridoHa, quantidade],
    );
    return rows.map((linha) => linha.evento_id).toSorted();
  }

  function eventosAlertados(erros: MockInstance): string[][] {
    return erros.mock.calls
      .filter(([, mensagem]) => mensagem === MENSAGEM_DE_EVENTOS_ESGOTADOS)
      .map(([campos]) => (campos as { eventos: string[] }).eventos);
  }

  it('alerta uma vez com os novos esgotados e avisa uma vez quando eles são resolvidos', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const vigia = app.get(VigiaDeEventosEsgotados);
    const esgotados = await eventosDe(EVENTOS_ESGOTADOS, '2 days');
    const { rows } = await banco.owner.query<{ maisAntigo: Date }>(
      'select min(ocorrido_em) as "maisAntigo" from shared.outbox',
    );

    await vigia.verificar();
    await vigia.verificar();
    await banco.owner.query('update shared.outbox set publicado_em = now()');
    await vigia.verificar();
    await vigia.verificar();

    expect(erros.mock.calls).toStrictEqual([
      [
        {
          novos: EVENTOS_ESGOTADOS,
          eventos: esgotados,
          quantidade: EVENTOS_ESGOTADOS,
          maisAntigoEm: rows[0]?.maisAntigo.toISOString(),
        },
        MENSAGEM_DE_EVENTOS_ESGOTADOS,
      ],
    ]);
    expect(informacoes.mock.calls).toStrictEqual([
      [{ quantidadeAnterior: EVENTOS_ESGOTADOS }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO],
    ]);
  });

  it('três tasks verificando ao mesmo tempo alertam cada esgotado uma vez só', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const esgotados = await eventosDe(15, '1 hour');
    const outras = [await subirContextoDeEventos(banco), await subirContextoDeEventos(banco)];
    try {
      await Promise.all([app, ...outras].map((contexto) => contexto.get(VigiaDeEventosEsgotados).verificar()));
    } finally {
      await Promise.all(outras.map((contexto) => encerrarContextoDeEventos(contexto)));
    }

    expect(eventosAlertados(erros).flat().toSorted()).toStrictEqual(esgotados);
  });

  it('outra task ou o processo depois de um restart não repetem o alerta do mesmo esgotado', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const esgotados = await eventosDe(1, '1 hour');
    const outraTask = await subirContextoDeEventos(banco);
    try {
      await app.get(VigiaDeEventosEsgotados).verificar();
      await outraTask.get(VigiaDeEventosEsgotados).verificar();
    } finally {
      await encerrarContextoDeEventos(outraTask);
    }

    expect(eventosAlertados(erros)).toStrictEqual([esgotados]);
  });

  it('um esgotado resolvido e outro novo no mesmo minuto, com a mesma quantidade, alertam o novo', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const vigia = app.get(VigiaDeEventosEsgotados);
    const primeiro = await eventosDe(1, '1 hour');
    await vigia.verificar();

    await banco.owner.query('update shared.outbox set publicado_em = now() where evento_id = $1', [primeiro[0]]);
    const segundo = await eventosDe(1, '10 minutes');
    await vigia.verificar();

    expect(eventosAlertados(erros)).toStrictEqual([primeiro, segundo]);
  });

  it('evento destravado que esgota de novo pelo despachante volta a alertar', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const comConsumidor = await subirContextoDeEventos(banco, [ConsumidorQueSempreFalha]);
    try {
      const evento = criarEvento({ tipo: TIPO_QUE_FALHA });
      await gravarEvento(comConsumidor, evento);
      await banco.owner.query(
        'update shared.outbox set tentativas = $1, alertado_em = now() - interval \'1 day\' where evento_id = $2',
        [TETO_DE_TENTATIVAS - 1, evento.eventoId],
      );

      await comConsumidor.get(Despachante).executarCiclo();
      await app.get(VigiaDeEventosEsgotados).verificar();

      expect(eventosAlertados(erros)).toStrictEqual([[evento.eventoId]]);
    } finally {
      await encerrarContextoDeEventos(comConsumidor);
    }
  });

  it('conta pelo índice outbox_esgotados, sem Seq Scan nem varrer o acúmulo de 200 mil pendentes', async () => {
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb
       from generate_series(1, ${EVENTOS_PENDENTES_NO_ACUMULO})`,
      [INSTITUICAO_A],
    );
    await gravarEsgotados(banco, EVENTOS_ESGOTADOS, '1 hour');
    await banco.owner.query('analyze shared.outbox');

    const { rows } = await banco.owner.query<Record<string, string>>(
      `explain (analyze, format text) ${CONSULTA_DOS_EVENTOS_ESGOTADOS}`,
    );
    const plano = rows.map((linha) => linha['QUERY PLAN']).join('\n');

    const predicado = await banco.owner.query<{ predicado: string }>(
      `select pg_get_expr(i.indpred, i.indrelid) as predicado
         from pg_index i join pg_class c on c.oid = i.indexrelid
        where c.relname = 'outbox_esgotados'`,
    );
    expect(predicado.rows[0]?.predicado).toBe(`((publicado_em IS NULL) AND (tentativas >= ${TETO_DE_TENTATIVAS}))`);
    expect(plano).toContain('outbox_esgotados');
    expect(plano).not.toContain('Seq Scan on outbox');
    expect(plano).not.toContain('outbox_por_agregado');
  }, 60_000);

  it('marca pelo índice outbox_esgotados, sem Seq Scan, com 200 mil pendentes', async () => {
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb
       from generate_series(1, ${EVENTOS_PENDENTES_NO_ACUMULO})`,
      [INSTITUICAO_A],
    );
    await eventosDe(EVENTOS_ESGOTADOS, '1 hour');
    await banco.owner.query('analyze shared.outbox');

    await banco.app.query('begin');
    let plano: string;
    try {
      const { rows } = await banco.app.query<Record<string, string>>(
        `explain (analyze, format text) ${MARCACAO_DOS_NOVOS_ESGOTADOS}`,
      );
      plano = rows.map((linha) => linha['QUERY PLAN']).join('\n');
    } finally {
      await banco.app.query('rollback');
    }

    expect(plano).toContain('outbox_esgotados');
    expect(plano).not.toContain('Seq Scan on outbox');
  }, 60_000);

  it('a migração cria alertado_em, desfazer remove e reaplicar restaura', async () => {
    const tipoDaColuna = async () => {
      const { rows } = await banco.owner.query<{ tipo: string | null }>(
        `select format_type(atttypid, atttypmod) as tipo from pg_attribute
          where attrelid = 'shared.outbox'::regclass and attname = 'alertado_em' and not attisdropped`,
      );
      return rows[0]?.tipo ?? null;
    };

    expect(await tipoDaColuna()).toBe('timestamp with time zone');
    await banco.owner.query(SQL_DE_DESFAZER);
    expect(await tipoDaColuna()).toBeNull();
    await banco.owner.query(SQL_DE_APLICAR);
    expect(await tipoDaColuna()).toBe('timestamp with time zone');
  });
});
