const MENSAGEM_GENERICA = 'o consumidor falhou ao processar o evento';
const TAMANHO_MAXIMO_DO_NOME_DA_CLASSE = 100;
const PADRAO_DE_CODIGO = /^[A-Z0-9_]{1,32}$/;
const PADRAO_DE_NOME_DE_CONSTRAINT = /^[A-Za-z0-9_]{1,63}$/;

function propriedadeTextualSegura(
  erro: Error,
  nome: 'code' | 'constraint',
  padrao: RegExp,
): string | undefined {
  const valor = (erro as unknown as Record<string, unknown>)[nome];
  return typeof valor === 'string' && padrao.test(valor) ? valor : undefined;
}

export function formatarUltimoErro(erro: Error): string {
  const classe = erro.constructor.name.slice(0, TAMANHO_MAXIMO_DO_NOME_DA_CLASSE);
  const codigo = propriedadeTextualSegura(erro, 'code', PADRAO_DE_CODIGO);
  const constraint = propriedadeTextualSegura(erro, 'constraint', PADRAO_DE_NOME_DE_CONSTRAINT);

  const identificador = codigo === undefined ? classe : `${classe}: ${codigo}`;
  const complemento = constraint === undefined ? '' : ` constraint=${constraint}`;
  return `${identificador}${complemento} - ${MENSAGEM_GENERICA}`;
}
