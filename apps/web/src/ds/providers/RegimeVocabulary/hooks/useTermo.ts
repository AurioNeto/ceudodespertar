import { createContext, use } from 'react';
import { REGIME_PADRAO, VOCAB } from '../constantes';
import type { Vocabulario } from '../tipos';

export const Ctx = createContext<Vocabulario>(VOCAB[REGIME_PADRAO]);

export const useTermo = (chave: keyof Vocabulario): string => use(Ctx)[chave];
