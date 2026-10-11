import { useState } from 'react';

export interface OpcoesDaPaginacao {
  porPagina: number;
  limitarPaginaAtual: boolean;
}

export function usePaginacao<T>(itens: readonly T[], { porPagina, limitarPaginaAtual }: OpcoesDaPaginacao) {
  const [pagina, setPagina] = useState(0);

  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const paginaAtual = limitarPaginaAtual ? Math.min(pagina, totalPaginas - 1) : pagina;
  const daPagina = itens.slice(paginaAtual * porPagina, (paginaAtual + 1) * porPagina);

  const paginaAnterior = () => setPagina(Math.max(0, paginaAtual - 1));
  const proximaPagina = () => setPagina(Math.min(totalPaginas - 1, paginaAtual + 1));
  const voltarAPrimeira = () => setPagina(0);

  return { paginaAtual, totalPaginas, daPagina, paginaAnterior, proximaPagina, voltarAPrimeira };
}
