import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { closeSync, mkdtempSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRAZO_DE_PARTIDA_EM_MS = 60_000;
const INTERVALO_DA_SONDA_EM_MS = 500;
const PRAZO_DE_ENCERRAMENTO_EM_MS = 5_000;
const CHAVE_DO_CAMINHO_DO_LOG = 'caminhoDoLogDaApi';

declare module 'vitest' {
  export interface ProvidedContext {
    caminhoDoLogDaApi: string;
  }
}

interface ProjetoDoVitest {
  provide<T>(chave: string, valor: T): void;
}

function pausar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function ambienteDaApi(): NodeJS.ProcessEnv {
  const porta = process.env['ACEITE_PORTA_API'];
  const urlDoKeycloak = `http://localhost:${process.env['ACEITE_PORTA_KEYCLOAK']}`;
  return {
    ...process.env,
    PORTA: porta,
    BANCO_URL: `postgres://cdd_app:${process.env['CDD_APP_SENHA']}@localhost:${process.env['ACEITE_PORTA_POSTGRES']}/cdd`,
    OIDC_EMISSOR: `${urlDoKeycloak}/realms/cdd`,
    OIDC_AUDIENCIA: 'cdd-api',
    KEYCLOAK_URL_BASE: urlDoKeycloak,
    KEYCLOAK_REALM: 'cdd',
    KEYCLOAK_ADMIN_CLIENT_ID: 'cdd-api-admin',
    APP_URL_BASE: 'http://localhost:5173',
    KEYCLOAK_CLIENT_ID_DO_CONVITE: 'cdd-web',
    LOG_NIVEL: 'info',
  };
}

async function esperarAApiResponder(url: string, processo: ChildProcess): Promise<void> {
  const limite = Date.now() + PRAZO_DE_PARTIDA_EM_MS;
  while (Date.now() < limite) {
    if (processo.exitCode !== null) throw new Error(`a API encerrou na partida (código ${processo.exitCode})`);
    // eslint-disable-next-line no-await-in-loop -- sonda sequencial até a API responder
    const pronta = await fetch(`${url}/saude/pronta`).then((resposta) => resposta.ok).catch(() => false);
    if (pronta) return;
    // eslint-disable-next-line no-await-in-loop -- intervalo entre sondas
    await pausar(INTERVALO_DA_SONDA_EM_MS);
  }
  throw new Error(`a API não ficou pronta em ${PRAZO_DE_PARTIDA_EM_MS} ms`);
}

async function exigirPortaLivre(url: string): Promise<void> {
  const ocupada = await fetch(`${url}/saude/pronta`).then(() => true).catch(() => false);
  if (ocupada) throw new Error(`já existe um servidor respondendo em ${url}; escolha outra ACEITE_PORTA_API`);
}

export async function setup(projeto: ProjetoDoVitest): Promise<() => Promise<void>> {
  await exigirPortaLivre(`http://localhost:${process.env['ACEITE_PORTA_API']}`);
  const raizDaApi = fileURLToPath(new URL('../..', import.meta.url));
  const caminhoDoLog = join(mkdtempSync(join(tmpdir(), 'cdd-aceite-api-')), 'api.log');
  const descritorDoLog = openSync(caminhoDoLog, 'w');
  const processo = spawn(process.execPath, ['--enable-source-maps', 'dist/main.js'], {
    cwd: raizDaApi,
    env: ambienteDaApi(),
    stdio: ['ignore', descritorDoLog, descritorDoLog],
  });
  try {
    await esperarAApiResponder(`http://localhost:${process.env['ACEITE_PORTA_API']}`, processo);
  } catch (erro) {
    processo.kill('SIGKILL');
    throw new Error(`${(erro as Error).message}; log da API em ${caminhoDoLog}`, { cause: erro });
  }
  projeto.provide(CHAVE_DO_CAMINHO_DO_LOG, caminhoDoLog);
  return async () => {
    await encerrar(processo);
    closeSync(descritorDoLog);
  };
}

async function encerrar(processo: ChildProcess): Promise<void> {
  if (processo.exitCode !== null || processo.signalCode !== null) return;
  const saiu = new Promise<void>((resolver) => processo.once('exit', () => resolver()));
  processo.kill('SIGTERM');
  const forcado = setTimeout(() => processo.kill('SIGKILL'), PRAZO_DE_ENCERRAMENTO_EM_MS);
  await saiu;
  clearTimeout(forcado);
}
