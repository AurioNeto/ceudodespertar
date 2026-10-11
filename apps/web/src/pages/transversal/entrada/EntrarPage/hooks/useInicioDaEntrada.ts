import { useState } from 'react';
import { useSessao } from '@/app/sessao';

export function useInicioDaEntrada(destino: string) {
  const { entrar } = useSessao();
  const [indo, setIndo] = useState(false);
  const [falhou, setFalhou] = useState(false);

  async function iniciar() {
    setIndo(true);
    setFalhou(false);
    try {
      await entrar(destino);
    } catch {
      setFalhou(true);
    }
    setIndo(false);
  }

  return { indo, falhou, iniciar };
}
