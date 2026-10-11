import { useState } from 'react';

export function useMenuDeCampo(campo: boolean, ativo: string | undefined) {
  const [aberto, setAberto] = useState(false);
  const [contextoVisto, setContextoVisto] = useState({ campo, ativo });
  if (contextoVisto.campo !== campo || contextoVisto.ativo !== ativo) {
    setContextoVisto({ campo, ativo });
    setAberto(false);
  }
  return {
    aberto,
    abrir: () => setAberto(true),
    fechar: () => setAberto(false),
  };
}
