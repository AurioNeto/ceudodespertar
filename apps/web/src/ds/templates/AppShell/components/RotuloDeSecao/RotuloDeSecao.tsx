import type { ReactNode } from 'react';
import { rotuloVersalete } from '../../../../fundacao/estilos';

export function RotuloDeSecao({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      style={{
        ...rotuloVersalete,
        color: 'var(--text-meta)',
        padding: '16px 8px 6px',
      }}
    >
      {children}
    </div>
  );
}
