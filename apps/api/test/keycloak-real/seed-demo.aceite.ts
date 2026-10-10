import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ID_DA_INSTITUICAO_DE_DEMONSTRACAO } from '../../src/modules/identidade/application/seed-demo/conteudo-da-demonstracao.js';
import { lerAmbienteDoAceite } from './ambiente-do-aceite.js';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';
import { executarSeedDemoPeloCli } from './cli-da-identidade.js';
import { ClienteDoKeycloak, subDoToken } from './cliente-do-keycloak.js';

const RAIZ_DA_API = fileURLToPath(new URL('../..', import.meta.url));
const BANCO_DA_DEMONSTRACAO = 'cdd_seed_demo_aceite';
const VARIAVEL_DA_INSTITUICAO = 'app.instituicao_id';
const TOTAL_DE_USUARIOS_DA_DEMONSTRACAO = 9;

let ambiente: AmbienteDoAceite;
let subDoDevPeloLogin: string;

function urlDoPostgres(usuario: string, senha: string, banco: string): string {
  return `postgres://${usuario}:${senha}@localhost:${process.env['ACEITE_PORTA_POSTGRES']}/${banco}`;
}

async function comoSuperusuario<T>(operacao: (cliente: Client) => Promise<T>): Promise<T> {
  const cliente = new Client({
    connectionString: urlDoPostgres('postgres', process.env['POSTGRES_SENHA_SUPERUSUARIO'] ?? '', 'postgres'),
  });
  await cliente.connect();
  try {
    return await operacao(cliente);
  } finally {
    await cliente.end();
  }
}

async function consultarComoApp<T extends object>(consulta: string, parametros: readonly unknown[]): Promise<T[]> {
  const cliente = new Client({
    connectionString: urlDoPostgres('cdd_app', process.env['CDD_APP_SENHA'] ?? '', BANCO_DA_DEMONSTRACAO),
  });
  await cliente.connect();
  try {
    await cliente.query('begin');
    await cliente.query('select set_config($1, $2, true)', [VARIAVEL_DA_INSTITUICAO, ID_DA_INSTITUICAO_DE_DEMONSTRACAO]);
    const { rows } = await cliente.query(consulta, [...parametros]);
    await cliente.query('rollback');
    return rows as T[];
  } finally {
    await cliente.end();
  }
}

async function recriarBancoDaDemonstracao(): Promise<void> {
  await comoSuperusuario(async (cliente) => {
    await cliente.query(`DROP DATABASE IF EXISTS ${BANCO_DA_DEMONSTRACAO} WITH (FORCE)`);
    await cliente.query(`CREATE DATABASE ${BANCO_DA_DEMONSTRACAO} OWNER cdd_owner TEMPLATE template0 ENCODING 'UTF8'`);
  });
  execFileSync(process.execPath, ['--enable-source-maps', 'dist/banco/cli.js', 'migrar'], {
    cwd: RAIZ_DA_API,
    env: {
      PATH: process.env['PATH'],
      BANCO_URL_MIGRACAO: urlDoPostgres('cdd_owner', process.env['CDD_OWNER_SENHA'] ?? '', BANCO_DA_DEMONSTRACAO),
    },
    stdio: 'pipe',
  });
}

beforeAll(async () => {
  ambiente = lerAmbienteDoAceite();
  const login = await new ClienteDoKeycloak(ambiente).entrarComSenha('dev@cdd.local', ambiente.senhaDoUsuarioDev);
  subDoDevPeloLogin = subDoToken(String(login.corpo['access_token']));
  await recriarBancoDaDemonstracao();
});

afterAll(async () => {
  await comoSuperusuario((cliente) => cliente.query(`DROP DATABASE IF EXISTS ${BANCO_DA_DEMONSTRACAO} WITH (FORCE)`));
});

describe('aceite do seed de demonstração contra o Keycloak real, em banco próprio', () => {
  it('CLI seed-demo — sai 0, cria a demonstração e liga o dev ao sub real do Keycloak', async () => {
    const saida = await executarSeedDemoPeloCli(ambiente, BANCO_DA_DEMONSTRACAO);
    const usuarios = await consultarComoApp<{ email: string; situacao: string; subject_id: string | null }>(
      'select email, situacao, subject_id from identidade.usuario order by email',
      [],
    );
    const dev = usuarios.find((usuario) => usuario.email === 'dev@cdd.local');

    expect(saida.codigo).toBe(0);
    expect(saida.stderr).toBe('');
    expect(saida.stdout).toContain('(criada)');
    expect(saida.stdout).not.toContain(subDoDevPeloLogin);
    expect(usuarios).toHaveLength(TOTAL_DE_USUARIOS_DA_DEMONSTRACAO);
    expect(dev).toEqual({ email: 'dev@cdd.local', situacao: 'ATIVO', subject_id: subDoDevPeloLogin });
  });

  it('o sub do login do dev resolve a instituição de demonstração pela função de descoberta', async () => {
    const linhas = await consultarComoApp<{ instituicao_id: string }>(
      'select instituicao_id from identidade.resolver_sujeito($1)',
      [subDoDevPeloLogin],
    );

    expect(linhas).toEqual([{ instituicao_id: ID_DA_INSTITUICAO_DE_DEMONSTRACAO }]);
  });

  it('reexecução contra o Keycloak real — sai 0 e nada novo é criado', async () => {
    const saida = await executarSeedDemoPeloCli(ambiente, BANCO_DA_DEMONSTRACAO);

    expect(saida.codigo).toBe(0);
    expect(saida.stdout).toContain('(já existia)');
    expect(saida.stdout).toContain(`Usuários criados: 0; já existentes: ${TOTAL_DE_USUARIOS_DA_DEMONSTRACAO}`);
  });
});
