import { useState } from 'react';

export function useHerdadas() {
  const [aberto, setAberto] = useState(false);
  const alternar = () => setAberto((a) => !a);
  return { aberto, alternar };
}
