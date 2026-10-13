export type RegraDeValidacao = string;

export interface ProblemaDeValidacao {
  readonly caminho: string;
  readonly regra: RegraDeValidacao;
}

export type DetalhesDeCorpoInvalido = {
  readonly problemas: readonly ProblemaDeValidacao[];
  readonly total: number;
};

const LIMITE_DE_PROBLEMAS_REPORTADOS = 20;

export function detalhesDeCorpoInvalido(problemas: readonly ProblemaDeValidacao[]): DetalhesDeCorpoInvalido {
  return { problemas: problemas.slice(0, LIMITE_DE_PROBLEMAS_REPORTADOS), total: problemas.length };
}
