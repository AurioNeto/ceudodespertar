import { useState } from 'react';

export function usePainelDeQuebra() {
  const [vista, setVista] = useState<'barras' | 'rosca'>('barras');
  const [hover, setHover] = useState<number | null>(null);
  return { vista, setVista, hover, setHover };
}
