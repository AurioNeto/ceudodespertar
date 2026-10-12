import { type FocusEvent, useEffect, useRef, useState } from 'react';

const QUASE_INTEIRA = 0.99;

export function useCabecalhoReduzido() {
  const sentinela = useRef<HTMLDivElement>(null);
  const [sentinelaFora, setSentinelaFora] = useState(false);
  const [focoNoCabecalho, setFocoNoCabecalho] = useState(false);

  useEffect(() => {
    const alvo = sentinela.current;
    if (!alvo || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada) return;
        if (!entrada.isIntersecting) setSentinelaFora(true);
        else if (entrada.intersectionRatio > QUASE_INTEIRA) setSentinelaFora(false);
      },
      { threshold: [0, 1] },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  const aoFocar = () => setFocoNoCabecalho(true);
  const aoDesfocar = (evento: FocusEvent<HTMLElement>) => {
    const destino = evento.relatedTarget;
    const focoFicaNoCabecalho = destino instanceof Node && evento.currentTarget.contains(destino);
    if (!focoFicaNoCabecalho) setFocoNoCabecalho(false);
  };

  return { sentinela, reduzido: sentinelaFora && !focoNoCabecalho, aoFocar, aoDesfocar };
}
