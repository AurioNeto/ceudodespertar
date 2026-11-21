import { describe, expect, it } from 'vitest';
import { construirTlsDoBanco } from './tls-do-banco.js';
import { construirOpcoesDoMigrador } from './opcoes-do-migrador.js';
import { construirOpcoesDoOrm } from '../shared/infrastructure/banco/configuracao-do-orm.js';
import { criarPoolDaProntidao } from '../shared/infrastructure/banco/pool-da-prontidao.js';

const AMBIENTE = {
  BANCO_URL: 'postgres://cdd_app:segredo@localhost:5432/cdd',
  BANCO_URL_MIGRACAO: 'postgres://cdd_owner:segredo@localhost:5432/cdd',
  BANCO_POOL_MAXIMO: '2',
};

describe('TLS do banco', () => {
  it('mantém a conexão local sem TLS quando não configurado', () => {
    expect(construirTlsDoBanco({})).toBe(false);
    expect(construirTlsDoBanco({ BANCO_TLS: 'desabilitado' })).toBe(false);
  });

  it('exige certificado confiável ao habilitar TLS', () => {
    expect(construirTlsDoBanco({ BANCO_TLS: 'verificar' })).toEqual({ rejectUnauthorized: true });
  });

  it('usa a CA explícita sem desabilitar a verificação', () => {
    expect(construirTlsDoBanco({ BANCO_TLS: 'verificar', BANCO_TLS_CA: 'certificado' })).toEqual({
      rejectUnauthorized: true, ca: 'certificado',
    });
  });

  it('configura TLS na API, migrador e sonda de prontidão', async () => {
    const ambiente = { ...AMBIENTE, BANCO_TLS: 'verificar', BANCO_TLS_CA: 'certificado' };
    const ssl = { rejectUnauthorized: true, ca: 'certificado' };
    expect(construirOpcoesDoOrm(ambiente).driverOptions).toEqual({ ssl });
    expect(construirOpcoesDoMigrador(ambiente).driverOptions).toEqual({ ssl });
    const pool = criarPoolDaProntidao(ambiente);
    try {
      expect(pool.options.ssl).toEqual(ssl);
    } finally {
      await pool.end();
    }
  });

  it('recusa valores que poderiam desativar a validação por engano', () => {
    expect(() => construirOpcoesDoOrm({ ...AMBIENTE, BANCO_TLS: 'false' })).toThrow(/BANCO_TLS/);
    expect(() => construirOpcoesDoMigrador({ ...AMBIENTE, BANCO_TLS: 'require' })).toThrow(/BANCO_TLS/);
    expect(() => construirOpcoesDoMigrador({ ...AMBIENTE, BANCO_MIGRACAO_ESCOPO: 'qualquer' })).toThrow();
  });

  it('permite aguardar a conexão remota sem ampliar o limite da consulta de prontidão', async () => {
    const pool = criarPoolDaProntidao({ ...AMBIENTE, BANCO_PRONTIDAO_CONEXAO_TIMEOUT_MS: '10000' });
    try {
      expect(pool.options.connectionTimeoutMillis).toBe(10_000);
      expect(pool.options.statement_timeout).toBe(1_000);
    } finally { await pool.end(); }
    expect(() => criarPoolDaProntidao({ ...AMBIENTE, BANCO_PRONTIDAO_CONEXAO_TIMEOUT_MS: '0' })).toThrow();
  });
});
