import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { CONSULTA_DO_PROXIMO_EVENTO } from '../../src/shared/infrastructure/eventos/despachante.js';
import { INSTITUICAO_A, semearInstituicoes } from './apoio.js';

async function lerDefinicaoDoIndice(
  banco: BancoDeTeste,
  nomeDoIndice: string,
): Promise<{ colunas: string[]; predicado: string }> {
  const resultado = await banco.owner.query(
    `select pg_get_indexdef(i.indexrelid, k.posicao, true) as coluna,
            pg_get_expr(i.indpred, i.indrelid) as predicado
     from pg_index i
     join pg_class c on c.oid = i.indexrelid
     cross join lateral generate_series(1, i.indnkeyatts) as k(posicao)
     where c.relname = $1
     order by k.posicao`,
    [nomeDoIndice],
  );
  const linhas = resultado.rows as { coluna: string; predicado: string }[];
  return { colunas: linhas.map((linha) => linha.coluna), predicado: linhas[0]?.predicado ?? '' };
}

describe('plano da consulta do despachante com histórico grande', () => {
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

    await banco.owner.query('begin');
    const plano = await banco.owner.query(
      `explain (analyze, buffers, format text) ${CONSULTA_DO_PROXIMO_EVENTO}`,
    );
    await banco.owner.query('rollback');

    const texto = plano.rows.map((linha: Record<string, string>) => linha['QUERY PLAN']).join('\n');

    const { colunas, predicado } = await lerDefinicaoDoIndice(banco, 'outbox_por_agregado');
    const [colunaDeOrdenacao, ...colunasDeIgualdade] = [...colunas].reverse();
    expect(colunas).toEqual(['agregado_tipo', 'agregado_id', 'id']);
    expect(predicado).toBe('(publicado_em IS NULL)');
    for (const coluna of colunasDeIgualdade) {
      expect(texto).toContain(`${coluna} = o.${coluna}`);
    }
    expect(texto).toContain(`${colunaDeOrdenacao} < o.${colunaDeOrdenacao}`);
    expect(texto).toContain('outbox_por_agregado');
    expect(texto).not.toContain('Seq Scan on outbox');
  }, 60000);
});
