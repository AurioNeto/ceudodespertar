import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const PASTA_DA_MIGRACAO = new URL('../../src/banco/migracoes/b0-014-search-path-das-funcoes/', import.meta.url);
const SQL_DE_APLICAR = readFileSync(new URL('search-path.sql', PASTA_DA_MIGRACAO), 'utf8');
const SQL_DE_DESFAZER = readFileSync(new URL('desfazer.sql', PASTA_DA_MIGRACAO), 'utf8');

const FUNCOES_DE_SHARED = [
  'aplicar_isolamento_por_instituicao',
  'instituicao_atual',
  'proibir_truncate',
  'somente_insercao',
];

describe('search_path das funções de shared', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  async function funcoesComCaminhoFixado(): Promise<string[]> {
    const { rows } = await banco.owner.query(
      "select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'shared' and p.proconfig @> array['search_path=pg_catalog, pg_temp'] order by p.proname",
    );
    return rows.map((linha: { proname: string }) => linha.proname);
  }

  it('sobe com as quatro funções fixadas; desfazer libera e reaplicar fixa de novo', async () => {
    expect(await funcoesComCaminhoFixado()).toEqual(FUNCOES_DE_SHARED);

    await banco.owner.query(SQL_DE_DESFAZER);
    expect(await funcoesComCaminhoFixado()).toEqual([]);

    await banco.owner.query(SQL_DE_APLICAR);
    await banco.owner.query(SQL_DE_APLICAR);
    expect(await funcoesComCaminhoFixado()).toEqual(FUNCOES_DE_SHARED);
  });

  it('tabela temporária homônima de catálogo não desvia a guarda de TRUNCATE', async () => {
    await banco.owner.query('CREATE TEMP TABLE pg_trigger (invalido text)');
    await banco.owner.query('CREATE TEMP TABLE ensaio_truncate (id integer)');
    await banco.owner.query('SET search_path = pg_temp, public, pg_catalog');

    await banco.owner.query("SELECT shared.proibir_truncate(ARRAY['ensaio_truncate'::regclass])");

    await expect(banco.owner.query('TRUNCATE ensaio_truncate')).rejects.toThrow('REGISTRO_IMUTAVEL');
    await expect(banco.owner.query('SELECT shared.aplicar_isolamento_por_instituicao()')).resolves.toBeDefined();
  });
});
