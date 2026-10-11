import { useState } from 'react';
import { meusLancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { useCarrossel } from '@/pages/hooks/useCarrossel';
import { POR_PAGINA } from '../constantes';
import type { Visao } from '../constantes';

export function useMeusRegistros() {
  const [visao, setVisao] = useState<Visao>('lista');
  const [pagina, setPagina] = useState(0);

  const registros = meusLancamentos;
  const { atual: indice, irPara } = useCarrossel(registros.length);
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  const daPagina = registros.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const abrirNoCartao = (i: number) => {
    irPara(i);
    setVisao('carrossel');
  };

  const paginaAnterior = () => setPagina((p) => Math.max(0, p - 1));
  const proximaPagina = () => setPagina((p) => Math.min(totalPaginas - 1, p + 1));

  return {
    visao,
    escolherVisao: setVisao,
    registros,
    pagina,
    totalPaginas,
    daPagina,
    paginaAnterior,
    proximaPagina,
    indice,
    irPara,
    abrirNoCartao,
  };
}
