import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AmbienteDoAceite } from './ambiente-do-aceite.js';

const RAIZ_DA_API = fileURLToPath(new URL('../..', import.meta.url));
const PRAZO_DO_CLI_EM_MS = 60_000;

export interface SaidaDoCliReal {
  readonly codigo: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function ambienteDoCli(ambiente: AmbienteDoAceite): NodeJS.ProcessEnv {
  const portaDoPostgres = process.env['ACEITE_PORTA_POSTGRES'];
  return {
    PATH: process.env['PATH'],
    TZ: 'UTC',
    BANCO_URL: `postgres://cdd_app:${process.env['CDD_APP_SENHA']}@localhost:${portaDoPostgres}/cdd`,
    BANCO_POOL_MAXIMO: '4',
    OIDC_EMISSOR: ambiente.emissor,
    OIDC_AUDIENCIA: 'cdd-api',
    KEYCLOAK_URL_BASE: ambiente.urlDoKeycloak,
    KEYCLOAK_REALM: ambiente.realm,
    KEYCLOAK_ADMIN_CLIENT_ID: 'cdd-api-admin',
    CDD_KC_ADMIN_SEGREDO: ambiente.segredoDaContaDeServico,
    APP_URL_BASE: 'http://localhost:5173',
    KEYCLOAK_CLIENT_ID_DO_CONVITE: 'cdd-web',
  };
}

export async function executarBootstrapPeloCli(
  ambiente: AmbienteDoAceite,
  argumentos: readonly string[],
): Promise<SaidaDoCliReal> {
  const processo = spawn(process.execPath, ['--enable-source-maps', 'dist/identidade-cli/cli.js', 'bootstrap', ...argumentos], {
    cwd: RAIZ_DA_API,
    env: ambienteDoCli(ambiente),
    timeout: PRAZO_DO_CLI_EM_MS,
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  processo.stdout.on('data', (parte: Buffer) => stdout.push(parte));
  processo.stderr.on('data', (parte: Buffer) => stderr.push(parte));
  const codigo = await new Promise<number | null>((resolver) => processo.once('close', resolver));
  return { codigo, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8') };
}
