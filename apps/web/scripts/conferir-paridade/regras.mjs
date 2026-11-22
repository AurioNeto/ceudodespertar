const SRC_DO_WEB = 'apps/web/src/';
const TESTE_DE_TELA = /\.(dom\.test\.tsx?|test\.tsx)$/;
const COMPONENTE_DE_TELA = /^apps\/web\/src\/pages\/(.+\/)?components\//;
const TITULO_DE_CASO = /\b(?:it|test)(?:\.[a-zA-Z]+)*(?:\([^)]*\))?\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;

const APAGADO = 'D';
const MODIFICADO = 'M';
const RENOMEADO = 'R';

export const ehTesteDeTela = (caminho) => caminho.startsWith(SRC_DO_WEB) && TESTE_DE_TELA.test(caminho);

const ehComponenteDeTela = (caminho) => COMPONENTE_DE_TELA.test(caminho) && !TESTE_DE_TELA.test(caminho);

export const titulosDosCasos = (texto) => [...texto.matchAll(TITULO_DE_CASO)].map(([, , titulo]) => titulo);

export function casosRemovidos(textoDaBase, textoDaPonta) {
  const restantes = new Set(titulosDosCasos(textoDaPonta));

  return titulosDosCasos(textoDaBase).filter((titulo) => !restantes.has(titulo));
}

function ocorrenciaDoApagado({ caminho }) {
  if (ehTesteDeTela(caminho)) {
    return { caminho, mensagem: 'teste de tela apagado' };
  }
  if (ehComponenteDeTela(caminho)) {
    return { caminho, mensagem: 'arquivo de componente de tela apagado' };
  }
  return undefined;
}

function ocorrenciaDoAlterado({ caminho, casosRemovidos: removidos = [] }) {
  if (removidos.length === 0) {
    return undefined;
  }

  return { caminho, mensagem: `teste de tela perdeu ${removidos.length} caso(s): ${removidos.join(' | ')}` };
}

const CONFERENCIA_POR_SITUACAO = {
  [APAGADO]: ocorrenciaDoApagado,
  [MODIFICADO]: ocorrenciaDoAlterado,
  [RENOMEADO]: ocorrenciaDoAlterado,
};

export function conferirParidade(mudancas) {
  return mudancas
    .map((mudanca) => CONFERENCIA_POR_SITUACAO[mudanca.situacao]?.(mudanca))
    .filter((ocorrencia) => ocorrencia !== undefined);
}
