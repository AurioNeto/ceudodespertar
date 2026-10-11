import { useState } from 'react';
import { usePaginacao } from '@/pages/financeiro/lancamentos/hooks/usePaginacao';
import { meusLancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { useCarrossel } from '@/pages/hooks/useCarrossel';
import { POR_PAGINA } from '../constantes';
import type { Visao } from '../constantes';

export function useMeusRegistros() {
  const [visao, setVisao] = useState<Visao>('lista');

  const registros = meusLancamentos;
  const { atual: indice, irPara } = useCarrossel(registros.length);
  const { paginaAtual, totalPaginas, daPagina, paginaAnterior, proximaPagina } = usePaginacao(registros, {
    porPagina: POR_PAGINA,
    limitarPaginaAtual: false,
  });

  const abrirNoCartao = (i: number) => {
    irPara(i);
    setVisao('carrossel');
  };

  return {
    visao,
    escolherVisao: setVisao,
    registros,
    pagina: paginaAtual,
    totalPaginas,
    daPagina,
    paginaAnterior,
    proximaPagina,
    indice,
    irPara,
    abrirNoCartao,
  };
}
