import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TETO_DE_TENTATIVAS } from '../../src/shared/infrastructure/eventos/teto-de-tentativas.js';
import { CONSULTA_DO_OUTBOX_ATRASADO } from '../../src/shared/infrastructure/saude/verificador-de-prontidao.js';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, semearInstituicoes } from '../eventos/apoio.js';

const EVENTOS_PUBLICADOS = 200_000;
const EVENTOS_ESGOTADOS = 50;

async function predicadoDoIndice(banco: BancoDeTeste, nomeDoIndice: string): Promise<string> {
  const { rows } = await banco.owner.query<{ predicado: string }>(
    `select pg_get_expr(i.indpred, i.indrelid) as predicado
       from pg_index i
       join pg_class c on c.oid = i.indexrelid
      where c.relname = $1`,
    [nomeDoIndice],
  );
  return rows[0]?.predicado ?? '';
}

async function planoDe(banco: BancoDeTeste, consulta: string): Promise<string> {
  const { rows } = await banco.owner.query<Record<string, string>>(`explain (analyze, format text) ${consulta}`);
  return rows.map((linha) => linha['QUERY PLAN']).join('\n');
}

describe('plano da consulta de prontidão com histórico grande (Documento 7 §13)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it('usa outbox_pendentes, não Seq Scan, com 200 mil publicados e eventos esgotados', async () => {
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, publicado_em)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb, now()
       from generate_series(1, ${EVENTOS_PUBLICADOS})`,
      [INSTITUICAO_A],
    );
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, tentativas)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb, ${TETO_DE_TENTATIVAS}
       from generate_series(1, ${EVENTOS_ESGOTADOS})`,
      [INSTITUICAO_A],
    );
    await banco.owner.query('analyze shared.outbox');

    const plano = await planoDe(banco, CONSULTA_DO_OUTBOX_ATRASADO);

    expect(await predicadoDoIndice(banco, 'outbox_pendentes')).toBe(
      `((publicado_em IS NULL) AND (tentativas < ${TETO_DE_TENTATIVAS}))`,
    );
    expect(plano).toContain('outbox_pendentes');
    expect(plano).not.toContain('Seq Scan on outbox');
  }, 60_000);
});
