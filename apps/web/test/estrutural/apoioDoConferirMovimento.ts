import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRETORIO_DO_APOIO = dirname(fileURLToPath(import.meta.url));
const SCRIPT_DO_VERIFICADOR = join(DIRETORIO_DO_APOIO, '..', '..', 'scripts', 'conferir-movimento.mjs');
const PASTA_DO_SRC = 'apps/web/src';
const OPCOES_DO_GIT = [
  '-c',
  'user.name=Teste',
  '-c',
  'user.email=teste@example.com',
  '-c',
  'commit.gpgsign=false',
  '-c',
  'core.hooksPath=/dev/null',
];

export const CODIGO_DE_SUCESSO = 0;
export const CODIGO_DE_FALHA = 1;
export const TEMPO_DO_CENARIO_EM_MS = 30_000;

export interface Resultado {
  codigo: number | null;
  saida: string;
  erro: string;
}

export interface Repositorio {
  raiz: string;
  escrever: (arquivos: Record<string, string>) => void;
  escreverNaRaiz: (arquivos: Record<string, string>) => void;
  mover: (de: string, para: string) => void;
  apagar: (caminho: string) => void;
  commitar: (mensagem: string) => string;
}

export interface Cenario {
  base: Record<string, string>;
  foraDoSrc?: Record<string, string>;
  depois: (repositorio: Repositorio) => void;
  pendencia?: (repositorio: Repositorio) => void;
  argumentos?: string[];
  pares?: unknown;
}

const repositoriosCriados: string[] = [];

export const emSrc = (caminho: string): string => `${PASTA_DO_SRC}/${caminho}`;

export const renomeacaoConferida = (de: string, para: string): string =>
  `renomeação: ${emSrc(de)} -> ${emSrc(para)}`;

export const renomeacaoComDiferenca = (de: string, para: string): string =>
  `renomeação com diferença fora das linhas de import: ${emSrc(de)} -> ${emSrc(para)}`;

export const arquivoNovoSemOrigem = (caminho: string, declaracoes?: string): string =>
  `arquivo novo sem origem: ${emSrc(caminho)}${declaracoes ? ` (declarações: ${declaracoes})` : ''}`;

export const codigo = (...linhas: string[]): string => `${linhas.join('\n')}\n`;

export function trocar(texto: string, de: string, para: string): string {
  if (!texto.includes(de)) {
    throw new Error(`o trecho a trocar não existe no texto: ${de}`);
  }

  return texto.replace(de, para);
}

export const removerRepositoriosCriados = (): void => {
  repositoriosCriados.splice(0).forEach((raiz) => rmSync(raiz, { recursive: true, force: true }));
};

export function executarGit(raiz: string, argumentos: string[]): string {
  const resultado = spawnSync('git', [...OPCOES_DO_GIT, ...argumentos], { cwd: raiz, encoding: 'utf8' });

  if (resultado.status !== CODIGO_DE_SUCESSO) {
    throw new Error(`git ${argumentos.join(' ')}: ${resultado.stderr}`);
  }

  return resultado.stdout.trim();
}

export function criarRepositorio(): Repositorio {
  const raiz = mkdtempSync(join(tmpdir(), 'conferir-movimento-'));
  repositoriosCriados.push(raiz);
  executarGit(raiz, ['init', '--quiet']);
  executarGit(raiz, ['config', 'diff.renames', 'false']);

  const caminhoNoDisco = (caminho: string): string => join(raiz, emSrc(caminho));
  const prepararDestino = (caminho: string): void => {
    mkdirSync(dirname(caminhoNoDisco(caminho)), { recursive: true });
  };

  return {
    raiz,
    escrever: (arquivos) => {
      for (const [caminho, conteudo] of Object.entries(arquivos)) {
        prepararDestino(caminho);
        writeFileSync(caminhoNoDisco(caminho), conteudo);
      }
    },
    escreverNaRaiz: (arquivos) => {
      for (const [caminho, conteudo] of Object.entries(arquivos)) {
        mkdirSync(dirname(join(raiz, caminho)), { recursive: true });
        writeFileSync(join(raiz, caminho), conteudo);
      }
    },
    mover: (de, para) => {
      prepararDestino(para);
      renameSync(caminhoNoDisco(de), caminhoNoDisco(para));
    },
    apagar: (caminho) => rmSync(caminhoNoDisco(caminho)),
    commitar: (mensagem) => {
      executarGit(raiz, ['add', '--all']);
      executarGit(raiz, ['commit', '--quiet', '--allow-empty', '--message', mensagem]);
      return executarGit(raiz, ['rev-parse', 'HEAD']);
    },
  };
}

export function executarVerificador(raiz: string, argumentos: string[] = []): Resultado {
  const resultado = spawnSync(process.execPath, [SCRIPT_DO_VERIFICADOR, ...argumentos], {
    cwd: raiz,
    encoding: 'utf8',
  });

  return { codigo: resultado.status, saida: resultado.stdout, erro: resultado.stderr };
}

function escreverPares(raiz: string, pares: unknown): string {
  const caminho = join(raiz, 'pares.json');
  writeFileSync(caminho, JSON.stringify(pares));
  return caminho;
}

export function executarCenario({
  base,
  foraDoSrc = {},
  depois,
  pendencia,
  argumentos,
  pares,
}: Cenario): Resultado {
  const repositorio = criarRepositorio();
  repositorio.escrever(base);
  repositorio.escreverNaRaiz(foraDoSrc);
  const shaDaBase = repositorio.commitar('base');
  depois(repositorio);
  repositorio.commitar('depois');
  pendencia?.(repositorio);

  const argumentosDoPares = pares === undefined ? [] : ['--pares', escreverPares(repositorio.raiz, pares)];

  return executarVerificador(repositorio.raiz, [
    ...(argumentos ?? ['--base', shaDaBase]),
    ...argumentosDoPares,
  ]);
}
