import { useState } from 'react';

export function useCarrossel(total: number) {
  const [atual, setAtual] = useState(0);
  const irPara = (posicao: number) => setAtual((posicao + total) % total);

  return { atual, irPara };
}
