import { useEffect, useRef, useState } from 'react';

const QUASE_INTEIRA = 0.99;

export function useCabecalhoReduzido() {
  const sentinela = useRef<HTMLDivElement>(null);
  const [reduzido, setReduzido] = useState(false);

  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada) return;
        if (!entrada.isIntersecting) setReduzido(true);
        else if (entrada.intersectionRatio > QUASE_INTEIRA) setReduzido(false);
      },
      { threshold: [0, 1] },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return { sentinela, reduzido };
}
