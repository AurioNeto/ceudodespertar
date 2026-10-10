import { execFileSync } from 'node:child_process';

const PASTA_CONFERIDA = 'apps/web/src';
const LIMITE_DA_SAIDA_EM_BYTES = 256 * 1024 * 1024;
const SEPARADOR_DE_CAMPOS = '\0';
const QUEBRA_DE_LINHA = 0x0a;
const OBJETO_AUSENTE = 'missing';
const LIMITE_DE_PENDENCIAS_NA_MENSAGEM = 10;

function git(diretorio, argumentos, entrada = '') {
  try {
    return execFileSync('git', argumentos, {
      cwd: diretorio,
      input: entrada,
      maxBuffer: LIMITE_DA_SAIDA_EM_BYTES,
      stdio: ['pipe', 'pipe', 'pipe'],
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

function exigirPastaSemPendencias(raiz) {
  const pendencias = gitComoTexto(raiz, ['status', '--porcelain', '--', PASTA_CONFERIDA])
    .split('\n')
    .filter(Boolean);

  if (pendencias.length === 0) {
    return;
  }

  const mostradas = pendencias.slice(0, LIMITE_DE_PENDENCIAS_NA_MENSAGEM);
  const restantes = pendencias.length - mostradas.length;
  const resto = restantes > 0 ? [`... e mais ${restantes}`] : [];

  throw new Error(
    [
      `há mudanças não commitadas em ${PASTA_CONFERIDA}; o verificador só lê commits (HEAD e merge-base).`,
      'Commite ou descarte antes de conferir:',
      ...mostradas,
      ...resto,
    ].join('\n'),
  );
}

function lerEmLote(raiz, ref, caminhos) {
  const saida = git(raiz, ['cat-file', '--batch'], caminhos.map((c) => `${ref}:${c}\n`).join(''));
  const conteudos = new Map();
  let posicao = 0;

  for (const caminho of caminhos) {
    const fimDoCabecalho = saida.indexOf(QUEBRA_DE_LINHA, posicao);
    const [, tipo, tamanho] = saida.toString('utf8', posicao, fimDoCabecalho).split(' ');
    posicao = fimDoCabecalho + 1;

    if (tipo !== OBJETO_AUSENTE) {
      conteudos.set(caminho, saida.subarray(posicao, posicao + Number(tamanho)));
      posicao += Number(tamanho) + 1;
    }
  }

  return conteudos;
}

function criarArvore(raiz, ref) {
  return {
    arquivos: arquivosEm(raiz, ref),
    conteudos: (caminhos) => lerEmLote(raiz, ref, caminhos),
    conteudoOpcional: (caminho) => lerEmLote(raiz, ref, [caminho]).get(caminho),
  };
}

export function abrirRepositorio(refDaBase, diretorio = process.cwd()) {
  const raiz = gitComoTexto(diretorio, ['rev-parse', '--show-toplevel']).trim();
  exigirPastaSemPendencias(raiz);
  const base = gitComoTexto(raiz, ['merge-base', refDaBase, 'HEAD']).trim();
  const arvoreDaBase = criarArvore(raiz, base);
  const arvoreDoHead = criarArvore(raiz, 'HEAD');
  const arquivosDaBase = arvoreDaBase.arquivos;
  const arquivosDoHead = arvoreDoHead.arquivos;

  return {
    base,
    arvoreDaBase,
    arvoreDoHead,
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
