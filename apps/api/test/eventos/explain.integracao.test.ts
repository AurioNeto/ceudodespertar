import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { INSTITUICAO_A, semearInstituicoes } from './apoio.js';

describe('plano da consulta do despachante com histórico grande (item 6)', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
    await semearInstituicoes(banco);
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  it('usa outbox_por_agregado, não Seq Scan, com 200 mil eventos publicados', async () => {
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload, publicado_em)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb, now()
       from generate_series(1, 200000)`,
      [INSTITUICAO_A],
    );
    await banco.owner.query(
      `insert into shared.outbox (evento_id, instituicao_id, tipo, agregado_tipo, agregado_id, payload)
       select gen_random_uuid(), $1, 't', 'A', gen_random_uuid(), '{}'::jsonb
       from generate_series(1, 5)`,
      [INSTITUICAO_A],
    );
    await banco.owner.query('analyze shared.outbox');

    const sql = `
      select o.id
      from shared.outbox o
      where o.publicado_em is null
        and o.tentativas < 10
        and coalesce(o.proxima_tentativa_em, '-infinity') <= now()
        and not exists (
          select 1
          from shared.outbox anterior
          where anterior.agregado_tipo = o.agregado_tipo
            and anterior.agregado_id = o.agregado_id
            and anterior.id < o.id
            and anterior.publicado_em is null
        )
      order by o.id
      limit 1
      for update skip locked
    `;

    await banco.owner.query('begin');
    const plano = await banco.owner.query(`explain (analyze, buffers, format text) ${sql}`);
    await banco.owner.query('rollback');

    const texto = plano.rows.map((linha: Record<string, string>) => linha['QUERY PLAN']).join('\n');

    expect(texto).toContain('outbox_por_agregado');
    expect(texto).not.toContain('Seq Scan on outbox');
  }, 60000);
});
