import type { Clima } from './tipos';

export const CLIMA_PADRAO: Clima = 'noite';

export const CHAVE_DO_CLIMA = 'cdd.clima';

export const CLIMAS: readonly { valor: Clima; label: string }[] = [
  { valor: 'noite', label: 'Noite' },
  { valor: 'amanhecer', label: 'Amanhecer' },
];

export const COR_DO_TEMA_POR_CLIMA: Record<Clima, string> = {
  noite: '#0B1F17',
  amanhecer: '#E9EDD8',
};
