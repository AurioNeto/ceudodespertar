import { useEffect, useState } from 'react';

export function useValorComAtraso<T>(valor: T, atrasoEmMs: number): T {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const espera = setTimeout(() => setValorAtrasado(valor), atrasoEmMs);
    return () => clearTimeout(espera);
  }, [valor, atrasoEmMs]);

  return valorAtrasado;
}
