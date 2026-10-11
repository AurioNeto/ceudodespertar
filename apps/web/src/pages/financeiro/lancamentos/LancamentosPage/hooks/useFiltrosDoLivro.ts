import { useMemo, useState } from 'react';
import type { LancamentoNaLista } from '@cdd/contracts';
import { lancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { FILTRO_INICIAL, POR_PAGINA } from '../constantes';
import { filtrarLancamentos } from '../utils/filtrarLancamentos';

export function useFiltrosDoLivro() {
  const [filtros, setFiltros] = useState<Record<string, string>>({ ...FILTRO_INICIAL });
  const [pagina, setPagina] = useState(0);
  const [selecionado, setSelecionado] = useState<LancamentoNaLista | null>(null);

  const filtrar = (campoFiltro: string, valor: string) => {
    setFiltros((f) => ({ ...f, [campoFiltro]: valor }));
    setPagina(0);
    setSelecionado(null);
  };

  const limparFiltros = () => setFiltros({ ...FILTRO_INICIAL });

  const lista = useMemo(() => filtrarLancamentos(lancamentos, filtros), [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const daPagina = lista.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  const paginaAnterior = () => {
    setPagina(Math.max(0, paginaAtual - 1));
    setSelecionado(null);
  };

  const proximaPagina = () => {
    setPagina(Math.min(totalPaginas - 1, paginaAtual + 1));
    setSelecionado(null);
  };

  const abrirDetalhe = (registro: LancamentoNaLista) => setSelecionado(registro);
  const fecharDetalhe = () => setSelecionado(null);

  return {
    filtros,
    filtrar,
    limparFiltros,
    lista,
    daPagina,
    paginaAtual,
    totalPaginas,
    paginaAnterior,
    proximaPagina,
    selecionado,
    abrirDetalhe,
    fecharDetalhe,
  };
}
