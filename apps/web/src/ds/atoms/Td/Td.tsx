import type { ReactNode } from 'react';

export function Td({ children, alinharDireita = false }: { children?: ReactNode; alinharDireita?: boolean }) {
  return (
    <td
      style={{
        padding: '11px 13px',
        textAlign: alinharDireita ? 'right' : 'left',
        color: 'var(--text-secondary)',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}
