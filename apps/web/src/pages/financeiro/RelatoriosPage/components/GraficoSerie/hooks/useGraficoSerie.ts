import { useState } from 'react';

export function useGraficoSerie() {
  const [hover, setHover] = useState<number | null>(null);
  return { hover, setHover };
}
