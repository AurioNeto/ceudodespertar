export const PASTA_DA_CAMADA_DE_DADOS = 'dados/';

export function estaNaCamadaDeDados(caminhoRelativoASrc: string): boolean {
  return caminhoRelativoASrc.startsWith(PASTA_DA_CAMADA_DE_DADOS);
}

export const GLOBAIS_DE_REDE: ReadonlySet<string> = new Set(['fetch', 'XMLHttpRequest', 'sendBeacon']);

export const MEMBRO_QUE_REQUISITA = 'requisitar';

export const METODO_DE_LEITURA = 'GET';

export const PROPRIEDADE_DO_METODO = 'metodo';
