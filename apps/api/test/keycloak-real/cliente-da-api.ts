import { randomUUID } from 'node:crypto';

export interface RespostaDaApi {
  readonly status: number;
  readonly cabecalhos: Headers;
  readonly corpo: Record<string, unknown> | null;
}

export interface OpcoesDaApi {
  readonly token?: string;
  readonly corpo?: unknown;
  readonly versaoEsperada?: number;
  readonly comChaveDeIdempotencia?: boolean;
}

export class ClienteDaApi {
  constructor(private readonly urlBase: string) {}

  async pedir(metodo: string, caminho: string, opcoes: OpcoesDaApi = {}): Promise<RespostaDaApi> {
    const cabecalhos: Record<string, string> = {};
    if (opcoes.token !== undefined) cabecalhos['authorization'] = `Bearer ${opcoes.token}`;
    if (opcoes.corpo !== undefined) cabecalhos['content-type'] = 'application/json';
    if (opcoes.versaoEsperada !== undefined) cabecalhos['if-match'] = `"${opcoes.versaoEsperada}"`;
    if (opcoes.comChaveDeIdempotencia === true) cabecalhos['idempotency-key'] = randomUUID();
    const resposta = await fetch(`${this.urlBase}/api/v1${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      ...(opcoes.corpo === undefined ? {} : { body: JSON.stringify(opcoes.corpo) }),
    });
    const texto = await resposta.text();
    const corpo = texto === '' ? null : (JSON.parse(texto) as Record<string, unknown>);
    return { status: resposta.status, cabecalhos: resposta.headers, corpo };
  }
}
