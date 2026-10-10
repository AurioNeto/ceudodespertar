import { execFileSync } from 'node:child_process';

const PASTA_CONFERIDA = 'apps/web/src';
const LIMITE_DA_SAIDA_EM_BYTES = 256 * 1024 * 1024;
const SEPARADOR_DE_CAMPOS = '\0';

function git(diretorio, argumentos) {
  try {
    return execFileSync('git', argumentos, {
      cwd: diretorio,
      maxBuffer: LIMITE_DA_SAIDA_EM_BYTES,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (erro) {
    const detalhe = erro.stderr?.toString().trim() || erro.message;
    throw new Error(`git ${argumentos.join(' ')}: ${detalhe}`, { cause: erro });
  }
}

const gitComoTexto = (diretorio, argumentos) => git(diretorio, argumentos).toString('utf8');

function entradaDoStatus(status, campos) {
  switch (status[0]) {
    case 'R':
      return { de: campos.shift(), para: campos.shift() };
    case 'C':
      campos.shift();
      return { de: null, para: campos.shift() };
    case 'A':
      return { de: null, para: campos.shift() };
    case 'D':
      return { de: campos.shift(), para: null };
    default: {
      const caminho = campos.shift();
      return { de: caminho, para: caminho };
    }
  }
}

function lerEntradas(saida) {
  const campos = saida.split(SEPARADOR_DE_CAMPOS).filter(Boolean);
  const entradas = [];

  while (campos.length > 0) {
    entradas.push(entradaDoStatus(campos.shift(), campos));
  }

  return entradas;
}

const arquivosEm = (raiz, ref) =>
  new Set(
    gitComoTexto(raiz, ['ls-tree', '-r', '-z', '--name-only', ref, '--', PASTA_CONFERIDA])
      .split(SEPARADOR_DE_CAMPOS)
      .filter(Boolean),
  );

export function abrirRepositorio(refDaBase, diretorio = process.cwd()) {
  const raiz = gitComoTexto(diretorio, ['rev-parse', '--show-toplevel']).trim();
  const base = gitComoTexto(raiz, ['merge-base', refDaBase, 'HEAD']).trim();
  const arquivosDaBase = arquivosEm(raiz, base);
  const arquivosDoHead = arquivosEm(raiz, 'HEAD');

  return {
    base,
    entradas: () =>
      lerEntradas(
        gitComoTexto(raiz, [
          'diff',
          '-z',
          '-M',
          '--name-status',
          base,
          'HEAD',
          '--',
          PASTA_CONFERIDA,
        ]),
      ),
    existeNaBase: (caminho) => arquivosDaBase.has(caminho),
    existeNoHead: (caminho) => arquivosDoHead.has(caminho),
    conteudoDaBase: (caminho) => git(raiz, ['show', `${base}:${caminho}`]),
    conteudoDoHead: (caminho) => git(raiz, ['show', `HEAD:${caminho}`]),
  };
}
