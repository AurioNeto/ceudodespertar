export function pedir(origem: string, caminho: string, cabecalhos: Record<string, string> = {}): Promise<Response> {
  return fetch(`${origem}${caminho}`, { headers: { ...cabecalhos, connection: 'close' } });
}
