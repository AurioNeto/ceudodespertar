import { useState } from 'react';
import { PAINEIS } from '../constantes';

export function useCarrosselDeCerimonias() {
  const [slide, setSlide] = useState(0);
  const irPara = (n: number) => setSlide((n + PAINEIS.length) % PAINEIS.length);

  return { slide, irPara };
}
