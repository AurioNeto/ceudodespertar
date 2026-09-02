import { useSyncExternalStore } from 'react';
import type { Density } from '../ds';

/**
 * Densidade de campo é a do celular: alvo de 56px, corpo maior, uma mão e
 * com pressa. Escritório é sentado, com mouse (tokens, --target-*).
 */
const CONSULTA = '(max-width: 900px)';

const assinar = (aoMudar: () => void) => {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener('change', aoMudar);
  return () => mq.removeEventListener('change', aoMudar);
};

export function useDensidade(): Density {
  const campo = useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
  return campo ? 'field' : 'office';
}
