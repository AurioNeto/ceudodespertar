import { useState } from 'react';

export type Visao = 'trilha' | 'acesso';

export function useAuditoria() {
  const [visao, setVisao] = useState<Visao>('trilha');

  return { visao, setVisao };
}
