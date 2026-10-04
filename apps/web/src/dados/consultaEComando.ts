import type { ClienteHttp, MetodoHttp } from './clienteHttp';

export type ChaveDeConsulta = readonly unknown[];

export interface DefinicaoDeConsulta<Saida> {
  readonly queryKey: ChaveDeConsulta;
  readonly queryFn: (contexto: { signal: AbortSignal }) => Promise<Saida>;
}

export interface DefinicaoDeComando<Entrada> {
  readonly metodo: Exclude<MetodoHttp, 'GET'>;
  readonly caminho: string | ((entrada: Entrada) => string);
  readonly corpo?: (entrada: Entrada) => unknown;
  readonly versao?: (entrada: Entrada) => number | string | undefined;
}

export interface OpcoesDeExecucao {
  readonly chaveDeIdempotencia?: string;
  readonly sinal?: AbortSignal;
}

export function criarConsulta(cliente: ClienteHttp) {
  return function consulta<Saida>(
    caminho: string,
    queryKey: ChaveDeConsulta = [caminho],
  ): DefinicaoDeConsulta<Saida> {
    return {
      queryKey,
      queryFn: ({ signal }) => cliente.requisitar<Saida>({ metodo: 'GET', caminho, sinal: signal }),
    };
  };
}

export function criarComando(cliente: ClienteHttp) {
  return function comando<Entrada, Saida>(definicao: DefinicaoDeComando<Entrada>) {
    return function executar(entrada: Entrada, opcoes: OpcoesDeExecucao = {}): Promise<Saida> {
      const caminho =
        typeof definicao.caminho === 'function' ? definicao.caminho(entrada) : definicao.caminho;
      const versao = definicao.versao?.(entrada);
      return cliente.requisitar<Saida>({
        metodo: definicao.metodo,
        caminho,
        ...(definicao.corpo ? { corpo: definicao.corpo(entrada) } : {}),
        ...(versao === undefined ? {} : { versao }),
        ...(opcoes.chaveDeIdempotencia ? { chaveDeIdempotencia: opcoes.chaveDeIdempotencia } : {}),
        ...(opcoes.sinal ? { sinal: opcoes.sinal } : {}),
      });
    };
  };
}
