import { useEffect, useState } from 'react';
import type { ServicoDeEntrada } from '@/dados';

export function useExisteUsuarioOidc(entrada: ServicoDeEntrada) {
  const [temUsuario, setTemUsuario] = useState<boolean | null>(null);

  useEffect(() => {
    let vivo = true;
    void entrada.recuperarSessao().then((existe) => {
      if (vivo) setTemUsuario(existe);
    });
    return () => {
      vivo = false;
    };
  }, [entrada]);

  return [temUsuario, setTemUsuario] as const;
}
