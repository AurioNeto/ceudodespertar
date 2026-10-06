import { CAMINHO_DA_ENTRADA } from '../dados/oidc';
import { ROTAS } from './navegacao';

const PREFIXOS_QUE_NAO_SAO_DESTINO = [CAMINHO_DA_ENTRADA];

function caminhoDoMesmoSite(valor: string): string | null {
  const origem = window.location.origin;
  let resolvido: URL;
  try {
    resolvido = new URL(valor, origem);
  } catch {
    return null;
  }
  if (resolvido.origin !== origem) return null;
  return `${resolvido.pathname}${resolvido.search}${resolvido.hash}`;
}

function ehTelaDeEntrada(caminho: string): boolean {
  return PREFIXOS_QUE_NAO_SAO_DESTINO.some(
    (prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`) || caminho.startsWith(`${prefixo}?`),
  );
}

export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== 'string' || !valor.startsWith('/')) return ROTAS.painel;
  const caminho = caminhoDoMesmoSite(valor);
  if (caminho === null || ehTelaDeEntrada(caminho)) return ROTAS.painel;
  return caminho;
}

export function destinoDaNavegacao(estado: unknown): string {
  if (typeof estado !== 'object' || estado === null || !('de' in estado)) return ROTAS.painel;
  return destinoSeguro(estado.de);
}
