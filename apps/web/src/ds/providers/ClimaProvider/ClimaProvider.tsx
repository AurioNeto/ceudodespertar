import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { CHAVE_DO_CLIMA, CLIMA_PADRAO, COR_DO_TEMA_POR_CLIMA } from './constantes';
import { Ctx } from './hooks/useClima';
import type { Clima } from './tipos';

type Armazenamento = Pick<Storage, 'getItem' | 'setItem'>;

const ehClima = (valor: unknown): valor is Clima => valor === 'noite' || valor === 'amanhecer';

const lerClima = (armazenamento: Armazenamento | undefined): Clima => {
  try {
    const salvo = (armazenamento ?? window.localStorage).getItem(CHAVE_DO_CLIMA);
    return ehClima(salvo) ? salvo : CLIMA_PADRAO;
  } catch {
    return CLIMA_PADRAO;
  }
};

const gravarClima = (armazenamento: Armazenamento | undefined, clima: Clima): boolean => {
  try {
    (armazenamento ?? window.localStorage).setItem(CHAVE_DO_CLIMA, clima);
    return true;
  } catch {
    return false;
  }
};

const aplicarNoDocumento = (clima: Clima) => {
  document.documentElement.dataset.clima = clima;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DO_TEMA_POR_CLIMA[clima]);
};

export interface ClimaProviderProps {
  children: ReactNode;
  armazenamento?: Armazenamento;
}

export function ClimaProvider({ children, armazenamento }: ClimaProviderProps) {
  const [clima, setClima] = useState<Clima>(() => lerClima(armazenamento));

  useLayoutEffect(() => {
    aplicarNoDocumento(clima);
  }, [clima]);

  useEffect(() => {
    const seguirOutraAba = (evento: StorageEvent) => {
      if (evento.key === CHAVE_DO_CLIMA && ehClima(evento.newValue)) setClima(evento.newValue);
    };
    window.addEventListener('storage', seguirOutraAba);
    return () => window.removeEventListener('storage', seguirOutraAba);
  }, []);

  const definirClima = (escolhido: Clima) => {
    gravarClima(armazenamento, escolhido);
    setClima(escolhido);
  };

  return <Ctx value={{ clima, definirClima }}>{children}</Ctx>;
}
