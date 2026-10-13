const MENSAGEM_GENERICA = 'o consumidor falhou ao processar o evento';
const MENSAGEM_DE_EVENTO_SEM_CONSUMIDOR = 'nenhum consumidor registrado para o tipo neste processo';
const TAMANHO_MAXIMO_DO_NOME_DA_CLASSE = 100;
const PROFUNDIDADE_MAXIMA_DA_CADEIA_DE_CAUSAS = 3;
const PADRAO_DE_CODIGO = /^[0-9A-Z]{5}$/;
const PADRAO_DE_CODIGO_DE_SISTEMA = /^E[A-Z0-9_]{2,30}$/;
const PADRAO_DE_NOME_DE_CONSTRAINT = /^[A-Za-z0-9_]{1,63}$/;

export class ErroDeEventoSemConsumidor extends Error {
  constructor(tipo: string) {
    super(`nenhum consumidor registrado para o tipo "${tipo}"`);
    this.name = 'ErroDeEventoSemConsumidor';
  }
}

function propriedadeTextualSegura(
  erro: Error,
  nome: 'code' | 'constraint',
  padroes: readonly RegExp[],
): string | undefined {
  const valor = (erro as unknown as Record<string, unknown>)[nome];
  return typeof valor === 'string' && padroes.some((padrao) => padrao.test(valor)) ? valor : undefined;
}

function classeDe(erro: Error): string {
  return erro.constructor.name.slice(0, TAMANHO_MAXIMO_DO_NOME_DA_CLASSE);
}

function identificacaoTecnica(erro: Error, padroesDeCodigo: readonly RegExp[]): string {
  const codigo = propriedadeTextualSegura(erro, 'code', padroesDeCodigo);
  const constraint = propriedadeTextualSegura(erro, 'constraint', [PADRAO_DE_NOME_DE_CONSTRAINT]);
  const identificador = codigo === undefined ? classeDe(erro) : `${classeDe(erro)}: ${codigo}`;
  return constraint === undefined ? identificador : `${identificador} constraint=${constraint}`;
}

export function formatarUltimoErro(erro: Error): string {
  if (erro instanceof ErroDeEventoSemConsumidor) {
    return `${classeDe(erro)} - ${MENSAGEM_DE_EVENTO_SEM_CONSUMIDOR}`;
  }
  return `${identificacaoTecnica(erro, [PADRAO_DE_CODIGO])} - ${MENSAGEM_GENERICA}`;
}

export function descreverFalhaDeInfraestrutura(erro: Error): string {
  const elos: string[] = [];
  let atual: unknown = erro;
  while (atual instanceof Error && elos.length < PROFUNDIDADE_MAXIMA_DA_CADEIA_DE_CAUSAS) {
    elos.push(identificacaoTecnica(atual, [PADRAO_DE_CODIGO, PADRAO_DE_CODIGO_DE_SISTEMA]));
    atual = atual.cause;
  }
  return elos.join(' <- ');
}
