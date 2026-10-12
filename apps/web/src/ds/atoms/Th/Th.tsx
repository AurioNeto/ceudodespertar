import type { ReactNode } from 'react';
import { rotuloVersalete } from '../../fundacao/estilos';

export function Th({ children, alinharDireita = false }: { children?: ReactNode; alinharDireita?: boolean }) {
  return (
    <th
      style={{
        ...rotuloVersalete,
        textAlign: alinharDireita ? 'right' : 'left',
        padding: '9px 13px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}
