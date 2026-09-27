import { describe, expect, it } from 'vitest';
import {
  construirOpcoesDoMigrador,
  extrairConexaoExplicitaDaUrl,
  SCHEMA_DA_TABELA_DE_HISTORICO,
  TABELA_DE_HISTORICO_DO_MIGRADOR,
} from './opcoes-do-migrador.js';

const AMBIENTE_VALIDO = {
  BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
};

describe('construirOpcoesDoMigrador', () => {
  it('fixa a configuração de execução exigida pelo Doc 7 §22', () => {
    const opcoes = construirOpcoesDoMigrador(AMBIENTE_VALIDO);

    expect(opcoes.migrations).toMatchObject({
      tableName: TABELA_DE_HISTORICO_DO_MIGRADOR,
      schema: SCHEMA_DA_TABELA_DE_HISTORICO,
      transactional: true,
      disableForeignKeys: false,
      allOrNothing: true,
      snapshot: false,
    });
  });

  it('extrai host, port, dbName, user e password explícitos da URL e nunca passa clientUrl', () => {
    const opcoes = construirOpcoesDoMigrador(AMBIENTE_VALIDO);

    expect(opcoes).toMatchObject({
      host: 'localhost',
      port: 5432,
      dbName: 'cdd',
      user: 'cdd_owner',
      password: 'segredo',
      schema: SCHEMA_DA_TABELA_DE_HISTORICO,
    });
    expect(opcoes.clientUrl).toBeUndefined();
  });

  it('ignora MIKRO_ORM_DB_NAME/MIKRO_ORM_SCHEMA do ambiente porque a validação já recusou antes de chegar aqui', () => {
    expect(() =>
      construirOpcoesDoMigrador({
        ...AMBIENTE_VALIDO,
        MIKRO_ORM_DB_NAME: 'cdd_outro',
      }),
    ).toThrow(/MIKRO_ORM_/);
  });
});

describe('extrairConexaoExplicitaDaUrl', () => {
  it('decodifica usuário e senha com caracteres especiais percent-encoded', () => {
    const conexao = extrairConexaoExplicitaDaUrl('postgres://cdd_owner:s%40enha%3A1@db:6543/cdd_p3');

    expect(conexao).toEqual({ host: 'db', port: 6543, dbName: 'cdd_p3', user: 'cdd_owner', password: 's@enha:1' });
  });

  it('usa a porta padrão do Postgres quando a URL não declara porta', () => {
    const conexao = extrairConexaoExplicitaDaUrl('postgres://cdd_owner:segredo@db/cdd');

    expect(conexao.port).toBe(5432);
  });
});
