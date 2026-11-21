import { BASE_DA_API } from './clienteHttp';

interface AmbienteDaApi {
  readonly VITE_API_URL?: string;
}

export function lerBaseDaApi(ambiente: AmbienteDaApi): string {
  if (!ambiente.VITE_API_URL) return BASE_DA_API;

  let url: URL;
  try {
    url = new URL(ambiente.VITE_API_URL);
  } catch {
    throw new Error('VITE_API_URL inválida: informe uma origem HTTPS, ou HTTP em localhost.');
  }

  const protocoloSeguro = url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost');
  if (!protocoloSeguro || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VITE_API_URL inválida: informe somente a origem, sem caminho, credenciais, query ou fragmento.');
  }

  return `${url.origin}${BASE_DA_API}`;
}
