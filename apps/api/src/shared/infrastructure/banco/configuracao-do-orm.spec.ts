import { describe, expect, it } from 'vitest';
import { construirOpcoesDoOrm } from './configuracao-do-orm.js';

const AMBIENTE_VALIDO = {
  BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd',
  BANCO_POOL_MAXIMO: '7',
};

describe('construirOpcoesDoOrm', () => {
  it('bloqueia acesso ao EntityManager global fora da unidade de trabalho', () => {
    const opcoes = construirOpcoesDoOrm(AMBIENTE_VALIDO);

    expect(opcoes.allowGlobalContext).toBe(false);
  });

  it('extrai host, port, dbName, user e password explícitos de BANCO_URL', () => {
    const opcoes = construirOpcoesDoOrm(AMBIENTE_VALIDO);

    expect(opcoes).toMatchObject({
      host: 'localhost',
      port: 5432,
      dbName: 'cdd',
      user: 'cdd_app',
      password: 'segredo',
    });
  });

  it('aplica BANCO_POOL_MAXIMO como o máximo do pool de conexões', () => {
    const opcoes = construirOpcoesDoOrm(AMBIENTE_VALIDO);

    expect(opcoes.pool).toMatchObject({ max: 7 });
  });

  it('não registra entidades — a fábrica é só para a borda transacional, sem mapeamento de agregados', () => {
    const opcoes = construirOpcoesDoOrm(AMBIENTE_VALIDO);

    expect(opcoes.entities).toEqual([]);
  });

  it('lança quando BANCO_URL é inválida', () => {
    expect(() => construirOpcoesDoOrm({ BANCO_URL: 'mysql://x', BANCO_POOL_MAXIMO: '1' })).toThrow();
  });

  it('lança quando BANCO_URL tem query string, em vez de descartá-la silenciosamente', () => {
    expect(() =>
      construirOpcoesDoOrm({
        BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd?sslmode=require',
        BANCO_POOL_MAXIMO: '1',
      }),
    ).toThrow();
  });
});
