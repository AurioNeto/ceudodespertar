import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inject } from 'vitest';
import type { BancoDeTeste } from '../integracao/banco-de-teste.js';
import { urlDoAppPara } from '../unidade-de-trabalho/orm-de-teste.js';

const RAIZ_DA_API = fileURLToPath(new URL('../..', import.meta.url));
const SONDA = fileURLToPath(new URL('sonda-de-temporizadores.cjs', import.meta.url));
const PRAZO_DO_PROCESSO_EM_MS = 8_000;

export interface ResultadoDoProcesso {
  readonly codigo: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly intervalosCriados: readonly number[];
}

const INTERVALO_DA_ESPERA_PELA_COMPILACAO_EM_MS = 200;
const PRAZO_DA_ESPERA_PELA_COMPILACAO_EM_MS = 180_000;

function pausarDeFormaSincrona(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function esperarCompilacaoDeOutroArquivo(marcadorDePronto: string): void {
  const limite = Date.now() + PRAZO_DA_ESPERA_PELA_COMPILACAO_EM_MS;
  while (!existsSync(marcadorDePronto)) {
    if (Date.now() > limite) throw new Error('a compilação do CLI por outro arquivo de teste não terminou');
    pausarDeFormaSincrona(INTERVALO_DA_ESPERA_PELA_COMPILACAO_EM_MS);
  }
}

export function compilarOCli(): void {
  const diretorioDaCompilacao = join(tmpdir(), `cdd-compilacao-do-cli-${process.ppid}`);
  const marcadorDePronto = join(diretorioDaCompilacao, 'pronto');
  try {
    mkdirSync(diretorioDaCompilacao);
  } catch {
    esperarCompilacaoDeOutroArquivo(marcadorDePronto);
    return;
  }
  execFileSync('pnpm', ['build'], { cwd: RAIZ_DA_API, stdio: 'pipe' });
  writeFileSync(marcadorDePronto, '');
}

export function urlDoOwnerPara(banco: BancoDeTeste): string {
  return `postgres://cdd_owner:${inject('senhaCddOwner')}@${inject('hostDoBanco')}:${inject('portaDoBanco')}/${banco.nomeDoBanco}`;
}

export function comoLocalhost(url: string): string {
  return url.replace('127.0.0.1', 'localhost');
}

export type VariaveisExtras = Readonly<Record<string, string | undefined>>;

function ambienteDoProcesso(
  banco: BancoDeTeste,
  urlDoKeycloak: string,
  arquivoDaSonda: string,
  extras: VariaveisExtras,
): NodeJS.ProcessEnv {
  return {
    PATH: process.env['PATH'],
    TZ: 'UTC',
    CDD_PROCESSO: 'api',
    CDD_SONDA_DE_TEMPORIZADORES: arquivoDaSonda,
    BANCO_URL: urlDoAppPara(banco),
    BANCO_URL_MIGRACAO: urlDoOwnerPara(banco),
    BANCO_POOL_MAXIMO: '4',
    OIDC_EMISSOR: `${urlDoKeycloak}/realms/cdd`,
    OIDC_AUDIENCIA: 'cdd-api',
    KEYCLOAK_URL_BASE: urlDoKeycloak,
    KEYCLOAK_REALM: 'cdd',
    KEYCLOAK_ADMIN_CLIENT_ID: 'cdd-api-admin',
    CDD_KC_ADMIN_SEGREDO: 'segredo-de-teste-da-conta-de-servico',
    APP_URL_BASE: 'http://localhost:5173',
    KEYCLOAK_CLIENT_ID_DO_CONVITE: 'cdd-web',
    ...extras,
  };
}

export async function executarProcessoDoCli(
  argumentos: readonly string[],
  banco: BancoDeTeste,
  urlDoKeycloak: string,
  extras: VariaveisExtras = {},
): Promise<ResultadoDoProcesso> {
  const diretorio = mkdtempSync(join(tmpdir(), 'cdd-cli-'));
  const arquivoDaSonda = join(diretorio, 'intervalos.txt');
  try {
    const processo = spawn(
      process.execPath,
      ['--require', SONDA, 'dist/identidade-cli/cli.js', ...argumentos],
      { cwd: RAIZ_DA_API, env: ambienteDoProcesso(banco, urlDoKeycloak, arquivoDaSonda, extras), timeout: PRAZO_DO_PROCESSO_EM_MS },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    processo.stdout.on('data', (parte: Buffer) => stdout.push(parte));
    processo.stderr.on('data', (parte: Buffer) => stderr.push(parte));
    const codigo = await new Promise<number | null>((resolver) => processo.once('close', resolver));
    return {
      codigo,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
      intervalosCriados: lerIntervalos(arquivoDaSonda),
    };
  } finally {
    rmSync(diretorio, { recursive: true, force: true });
  }
}

function lerIntervalos(arquivo: string): number[] {
  try {
    return readFileSync(arquivo, 'utf8').split('\n').filter(Boolean).map(Number);
  } catch {
    return [];
  }
}
