import { Pool } from 'pg';
import { extrairConexaoExplicitaDaUrl } from '../../../banco/opcoes-do-migrador.js';
import { analisarAmbienteDoBanco } from './esquema-de-ambiente-do-banco.js';

export const POOL_DA_PRONTIDAO = Symbol('POOL_DA_PRONTIDAO');
export const NOME_DA_CONEXAO_DA_PRONTIDAO = 'cdd-api-prontidao';
export const TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS = 1_000;

const CONEXOES_DA_PRONTIDAO = 1;
const SESSAO_SOMENTE_LEITURA = '-c default_transaction_read_only=on';

export function criarPoolDaProntidao(bruto: NodeJS.ProcessEnv = process.env): Pool {
  const { BANCO_URL } = analisarAmbienteDoBanco(bruto);
  const conexao = extrairConexaoExplicitaDaUrl(BANCO_URL);
  return new Pool({
    host: conexao.host,
    port: conexao.port,
    database: conexao.dbName,
    user: conexao.user,
    password: conexao.password,
    max: CONEXOES_DA_PRONTIDAO,
    connectionTimeoutMillis: TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS,
    statement_timeout: TIMEOUT_DA_CONSULTA_DE_PRONTIDAO_EM_MS,
    application_name: NOME_DA_CONEXAO_DA_PRONTIDAO,
    options: SESSAO_SOMENTE_LEITURA,
  });
}
