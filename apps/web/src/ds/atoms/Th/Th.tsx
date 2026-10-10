import type { ReactNode } from 'react';
import { rotuloCaixaAlta } from '../../fundacao/estilos';

export function Th({ children, alinharDireita = false }: { children?: ReactNode; alinharDireita?: boolean }) {
  return (
    <th
      style={{
        ...rotuloCaixaAlta,
        textAlign: alinharDireita ? 'right' : 'left',
        padding: '9px 13px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}
