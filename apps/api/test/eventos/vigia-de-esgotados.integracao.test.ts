import { Logger } from '@nestjs/common';
import type { INestApplicationContext } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TETO_DE_TENTATIVAS } from '../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import {
  CONSULTA_DOS_EVENTOS_ESGOTADOS,
  MENSAGEM_DE_EVENTOS_ESGOTADOS,
  MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO,
  VigiaDeEventosEsgotados,
} from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, encerrarContextoDeEventos, semearInstituicoes, subirContextoDeEventos } from './apoio.js';

const EVENTOS_PENDENTES_NO_ACUMULO = 200_000;
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
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
    app = await subirContextoDeEventos(banco);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await encerrarContextoDeEventos(app);
    await derrubarBancoDeTeste(banco);
  });

  it('alerta com a contagem e o mais antigo, e avisa uma vez quando os esgotados são resolvidos', async () => {
    const erros = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const informacoes = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const vigia = app.get(VigiaDeEventosEsgotados);
    await gravarEsgotados(banco, EVENTOS_ESGOTADOS, '2 days');
    const { rows } = await banco.owner.query<{ maisAntigo: Date }>(
      'select min(ocorrido_em) as "maisAntigo" from shared.outbox',
    );

    await vigia.verificar();
    await vigia.verificar();
    await banco.owner.query('update shared.outbox set publicado_em = now()');
    await vigia.verificar();
    await vigia.verificar();

    expect(erros.mock.calls).toStrictEqual([
      [{ quantidade: EVENTOS_ESGOTADOS, maisAntigoEm: rows[0]?.maisAntigo.toISOString() }, MENSAGEM_DE_EVENTOS_ESGOTADOS],
    ]);
    expect(informacoes.mock.calls).toStrictEqual([
      [{ quantidadeAnterior: EVENTOS_ESGOTADOS }, MENSAGEM_DE_NENHUM_EVENTO_ESGOTADO],
    ]);
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
});
