import { CAMINHO_DA_ENTRADA } from '../dados/oidc';
import { ROTAS } from './navegacao';

const PREFIXOS_QUE_NAO_SAO_DESTINO = [CAMINHO_DA_ENTRADA];

function ehCaminhoDoMesmoSite(valor: string): boolean {
  return valor.startsWith('/') && !valor.startsWith('//') && !valor.startsWith('/\\');
}

function ehTelaDeEntrada(caminho: string): boolean {
  return PREFIXOS_QUE_NAO_SAO_DESTINO.some(
    (prefixo) => caminho === prefixo || caminho.startsWith(`${prefixo}/`) || caminho.startsWith(`${prefixo}?`),
  );
}

export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== 'string') return ROTAS.painel;
  if (!ehCaminhoDoMesmoSite(valor)) return ROTAS.painel;
  if (ehTelaDeEntrada(valor)) return ROTAS.painel;
  return valor;
}

export function destinoDaNavegacao(estado: unknown): string {
  if (typeof estado !== 'object' || estado === null || !('de' in estado)) return ROTAS.painel;
  return destinoSeguro(estado.de);
}
