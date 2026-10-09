import { useEffect, useRef, useState } from 'react';

const SELETOR_DE_CAMPO_INVALIDO = '[aria-invalid="true"]';

export function useFocoNoPrimeiroCampoInvalido<Raiz extends HTMLElement>() {
  const raiz = useRef<Raiz>(null);
  const [pedidos, setPedidos] = useState(0);

  useEffect(() => {
    if (pedidos === 0) return;
    raiz.current?.querySelector<HTMLElement>(SELETOR_DE_CAMPO_INVALIDO)?.focus();
  }, [pedidos]);

  const focarPrimeiroCampoInvalido = () => setPedidos((anteriores) => anteriores + 1);

  return { raiz, focarPrimeiroCampoInvalido };
}
