import { createContext, use } from 'react';
import { CLIMA_PADRAO } from '../constantes';
import type { Clima } from '../tipos';

interface ValorDoClima {
  clima: Clima;
  definirClima: (clima: Clima) => void;
}

export const Ctx = createContext<ValorDoClima>({ clima: CLIMA_PADRAO, definirClima: () => undefined });

export const useClima = (): ValorDoClima => use(Ctx);
