import { useState } from 'react';

export function usePainelDeFiltros(abertosDeInicio: boolean) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(abertosDeInicio);
  const alternarFiltros = () => setFiltrosAbertos((a) => !a);
  return { filtrosAbertos, alternarFiltros };
}
