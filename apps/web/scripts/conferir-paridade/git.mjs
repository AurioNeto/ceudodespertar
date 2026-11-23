import { execFileSync } from 'node:child_process';
import { casosRemovidos, ehTesteDeTela } from './regras.mjs';

const SRC_DO_WEB = 'apps/web/src';
const LIMITE_DA_SAIDA_EM_BYTES = 64 * 1024 * 1024;
const SITUACOES_COM_DOIS_LADOS = new Set(['M', 'R']);

function git(argumentos) {
  return execFileSync('git', argumentos, { encoding: 'utf8', maxBuffer: LIMITE_DA_SAIDA_EM_BYTES });
}

const conteudoEm = (ref, caminho) => git(['show', `${ref}:${caminho}`]);

function mudancaDa({ base, ponta }, linha) {
  const [codigo, caminhoAnterior, caminhoNovo] = linha.split('\t');
  const situacao = codigo.charAt(0);
  const caminho = caminhoNovo ?? caminhoAnterior;
  const comparaCasos = SITUACOES_COM_DOIS_LADOS.has(situacao) && ehTesteDeTela(caminho);

  return {
    situacao,
    caminho,
    casosRemovidos: comparaCasos ? casosRemovidos(conteudoEm(base, caminhoAnterior), conteudoEm(ponta, caminho)) : [],
  };
}

export function lerMudancas(base, ponta = 'HEAD') {
  return git(['diff', '--name-status', '-M', base, ponta, '--', SRC_DO_WEB])
    .split('\n')
    .filter((linha) => linha.length > 0)
    .map((linha) => mudancaDa({ base, ponta }, linha));
}
