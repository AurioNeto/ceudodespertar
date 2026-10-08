export interface OpcoesDaRequisicao {
  readonly metodo?: string;
  readonly corpo?: unknown;
  readonly cabecalhos?: Record<string, string>;
}

export function pedir(
  origem: string,
  caminho: string,
  cabecalhos: Record<string, string> = {},
  { metodo = 'GET', corpo }: Pick<OpcoesDaRequisicao, 'metodo' | 'corpo'> = {},
): Promise<Response> {
  const comCorpo = corpo === undefined ? {} : { 'content-type': 'application/json' };
  return fetch(`${origem}${caminho}`, {
    method: metodo,
    headers: { ...comCorpo, ...cabecalhos, connection: 'close' },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  });
}
