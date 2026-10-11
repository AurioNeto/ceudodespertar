import { useState } from 'react';
import type { Visao } from '../tipos';

export function useAuditoria() {
  const [visao, setVisao] = useState<Visao>('trilha');

  return { visao, setVisao };
}
