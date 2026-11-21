import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const PASTA_DA_MIGRACAO = join(dirname(fileURLToPath(import.meta.url)), '../../src/banco/migracoes/b1-002-conta-e-fundo');
const SQL_DE_APLICAR = readFileSync(join(PASTA_DA_MIGRACAO, 'conta-e-fundo.sql'), 'utf8');
const SQL_DE_DESFAZER = readFileSync(join(PASTA_DA_MIGRACAO, 'desfazer.sql'), 'utf8');

const CADASTROS_ANTERIORES = ['categoria', 'grupo_de_custo', 'unidade'];
const TODAS_AS_TABELAS = [...CADASTROS_ANTERIORES, 'conta', 'fundo'].toSorted();

describe('migration de conta e fundo', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  async function tabelasDoFinanceiro(): Promise<{ tabelas: string[]; comRlsForcada: string[] }> {
    const { rows } = await banco.owner.query(
      "select c.relname, c.relrowsecurity and c.relforcerowsecurity as forcada from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'financeiro' and c.relkind = 'r' order by c.relname",
    );
    return {
      tabelas: rows.map((linha: { relname: string }) => linha.relname),
      comRlsForcada: rows.filter((linha: { forcada: boolean }) => linha.forcada).map((linha: { relname: string }) => linha.relname),
    };
  }

  it('sobe com conta e fundo, RLS forçada em todas as tabelas do schema', async () => {
    expect(await tabelasDoFinanceiro()).toEqual({ tabelas: TODAS_AS_TABELAS, comRlsForcada: TODAS_AS_TABELAS });
  });

  it('desfazer remove só conta e fundo e reaplicar os restaura, de novo com RLS forçada', async () => {
    await banco.owner.query(SQL_DE_DESFAZER);

    expect(await tabelasDoFinanceiro()).toEqual({ tabelas: CADASTROS_ANTERIORES, comRlsForcada: CADASTROS_ANTERIORES });

    await banco.owner.query(SQL_DE_APLICAR);

    expect(await tabelasDoFinanceiro()).toEqual({ tabelas: TODAS_AS_TABELAS, comRlsForcada: TODAS_AS_TABELAS });
  });

  it('o índice do identificador bancário é único e parcial', async () => {
    const { rows } = await banco.owner.query(
      "select indisunique, pg_get_expr(indpred, indrelid) as predicado from pg_index where indexrelid = 'financeiro.conta_identificador_unico'::regclass",
    );

    expect(rows).toEqual([{ indisunique: true, predicado: '(identificador_bancario IS NOT NULL)' }]);
  });
});
