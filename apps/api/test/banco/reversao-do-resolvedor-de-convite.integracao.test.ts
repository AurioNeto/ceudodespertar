import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { criarBancoDeTeste, derrubarBancoDeTeste } from '../integracao/banco-de-teste.js';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';

const PASTA_DA_MIGRACAO = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../src/banco/migracoes/b0-010-resolver-convite',
);
const SQL_DE_APLICAR = readFileSync(join(PASTA_DA_MIGRACAO, 'resolver-convite.sql'), 'utf8');
const SQL_DE_DESFAZER = readFileSync(join(PASTA_DA_MIGRACAO, 'desfazer.sql'), 'utf8');

describe('reversão do resolvedor de convite', () => {
  let banco: BancoDeTeste;

  beforeEach(async () => {
    banco = await criarBancoDeTeste();
  });

  afterEach(async () => {
    await derrubarBancoDeTeste(banco);
  });

  async function funcaoExiste(): Promise<boolean> {
    const { rows } = await banco.owner.query(
      `select to_regprocedure('identidade.resolver_convite(bytea)') is not null as existe`,
    );
    return (rows[0] as { existe: boolean }).existe;
  }

  async function politicasDeConvite(): Promise<string[]> {
    const { rows } = await banco.owner.query(
      `select polname from pg_policy where polrelid = 'identidade.convite'::regclass order by polname`,
    );
    return rows.map((linha: { polname: string }) => linha.polname);
  }

  async function colunasLegiveisPeloResolvedor(): Promise<string[]> {
    const { rows } = await banco.owner.query(
      `select a.attname from pg_attribute a
        where a.attrelid = 'identidade.convite'::regclass and a.attnum > 0 and not a.attisdropped
          and has_column_privilege('cdd_resolvedor_identidade', 'identidade.convite', a.attname, 'SELECT')`,
    );
    return rows.map((linha: { attname: string }) => linha.attname);
  }

  it('desfazer remove função, política e privilégio de coluna, e reaplicar restaura', async () => {
    expect(await funcaoExiste()).toBe(true);

    await banco.owner.query(SQL_DE_DESFAZER);

    expect(await funcaoExiste()).toBe(false);
    expect(await politicasDeConvite()).toEqual(['isolamento_por_instituicao']);
    expect(await colunasLegiveisPeloResolvedor()).toEqual([]);

    await banco.owner.query(SQL_DE_APLICAR);

    expect(await funcaoExiste()).toBe(true);
    expect(await politicasDeConvite()).toEqual(['isolamento_por_instituicao', 'resolucao_do_convite']);
    expect(await colunasLegiveisPeloResolvedor()).toHaveLength(3);
  });

  it('desfazer duas vezes não falha', async () => {
    await banco.owner.query(SQL_DE_DESFAZER);

    await expect(banco.owner.query(SQL_DE_DESFAZER)).resolves.toBeDefined();
  });
});
