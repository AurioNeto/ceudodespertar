import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const PASTA_DA_MIGRACAO = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/banco/migracoes/b1-001-cadastros-do-financeiro',
);
const SQL_DE_APLICAR = readFileSync(join(PASTA_DA_MIGRACAO, 'cadastros-do-financeiro.sql'), 'utf8');
const SQL_DE_DESFAZER = readFileSync(join(PASTA_DA_MIGRACAO, 'desfazer.sql'), 'utf8');
const SQL_DE_DESFAZER_CONTA_E_FUNDO = readFileSync(
  join(PASTA_DA_MIGRACAO, '../b1-002-conta-e-fundo/desfazer.sql'),
  'utf8',
);

describe('migration dos cadastros do financeiro', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  async function objetosDoSchema(): Promise<{ schema: boolean; tabelas: string[]; comRlsForcada: string[] }> {
    const { rows: schemas } = await banco.owner.query("select 1 from pg_namespace where nspname = 'financeiro'");
    const { rows: tabelas } = await banco.owner.query(
      "select c.relname, c.relrowsecurity and c.relforcerowsecurity as forcada from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'financeiro' and c.relkind = 'r' order by c.relname",
    );
    return {
      schema: schemas.length === 1,
      tabelas: tabelas.map((linha: { relname: string }) => linha.relname),
      comRlsForcada: tabelas.filter((linha: { forcada: boolean }) => linha.forcada).map((linha: { relname: string }) => linha.relname),
    };
  }

  it('sobe com os três cadastros e RLS forçada em todas as tabelas do schema', async () => {
    const todas = ['categoria', 'conta', 'fundo', 'grupo_de_custo', 'unidade'];

    expect(await objetosDoSchema()).toEqual({ schema: true, tabelas: todas, comRlsForcada: todas });
  });

  it('desfazer remove o schema inteiro e reaplicar o restaura, de novo com RLS forçada', async () => {
    await banco.owner.query(SQL_DE_DESFAZER_CONTA_E_FUNDO);
    await banco.owner.query(SQL_DE_DESFAZER);

    expect(await objetosDoSchema()).toEqual({ schema: false, tabelas: [], comRlsForcada: [] });

    await banco.owner.query(SQL_DE_APLICAR);

    expect(await objetosDoSchema()).toEqual({
      schema: true,
      tabelas: ['categoria', 'grupo_de_custo', 'unidade'],
      comRlsForcada: ['categoria', 'grupo_de_custo', 'unidade'],
    });
  });

  it('desfazer não toca as tabelas das migrations anteriores', async () => {
    await banco.owner.query(SQL_DE_DESFAZER_CONTA_E_FUNDO);
    await banco.owner.query(SQL_DE_DESFAZER);

    const { rows } = await banco.owner.query("select to_regclass('identidade.grupo') is not null as existe");
    expect(rows[0]).toEqual({ existe: true });
  });
});
