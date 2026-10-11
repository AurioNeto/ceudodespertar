import { useMemo, useState } from 'react';
import type { LancamentoNaLista } from '@cdd/contracts';
import { usePaginacao } from '@/pages/financeiro/lancamentos/hooks/usePaginacao';
import { lancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { FILTRO_INICIAL, POR_PAGINA } from '../constantes';
import { filtrarLancamentos } from '../utils/filtrarLancamentos';

export function useFiltrosDoLivro() {
  const [filtros, setFiltros] = useState<Record<string, string>>({ ...FILTRO_INICIAL });
  const [selecionado, setSelecionado] = useState<LancamentoNaLista | null>(null);

  const lista = useMemo(() => filtrarLancamentos(lancamentos, filtros), [filtros]);
  const { paginaAtual, totalPaginas, daPagina, ...paginacao } = usePaginacao(lista, {
    porPagina: POR_PAGINA,
    limitarPaginaAtual: true,
  });

  const filtrar = (campoFiltro: string, valor: string) => {
    setFiltros((f) => ({ ...f, [campoFiltro]: valor }));
    paginacao.voltarAPrimeira();
    setSelecionado(null);
  };

  const limparFiltros = () => setFiltros({ ...FILTRO_INICIAL });

  const paginaAnterior = () => {
    paginacao.paginaAnterior();
    setSelecionado(null);
  };

  const proximaPagina = () => {
    paginacao.proximaPagina();
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
