import { useState } from 'react';
import { meusLancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { POR_PAGINA } from '../constantes';
import type { Visao } from '../constantes';
import { totaisDosRegistros } from '../utils/totaisDosRegistros';

export function useMeusRegistros() {
  const [visao, setVisao] = useState<Visao>('lista');
  const [indice, setIndice] = useState(0);
  const [pagina, setPagina] = useState(0);

  const registros = meusLancamentos;
  const totalPaginas = Math.max(1, Math.ceil(registros.length / POR_PAGINA));
  const daPagina = registros.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);

  const { saidas, entradas } = totaisDosRegistros(registros);

  const irPara = (i: number) => setIndice((i + registros.length) % registros.length);
  const abrirNoCartao = (i: number) => {
    setIndice(i);
    setVisao('carrossel');
  };

  const paginaAnterior = () => setPagina((p) => Math.max(0, p - 1));
  const proximaPagina = () => setPagina((p) => Math.min(totalPaginas - 1, p + 1));

  return {
    visao,
    escolherVisao: setVisao,
    registros,
    saidas,
    entradas,
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
