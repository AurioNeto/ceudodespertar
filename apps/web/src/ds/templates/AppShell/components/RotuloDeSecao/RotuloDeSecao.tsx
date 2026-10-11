import type { ReactNode } from 'react';

export function RotuloDeSecao({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      style={{
        font: 'var(--text-label)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: 'var(--text-meta)',
        padding: '16px 8px 6px',
      }}
    >
      {children}
    </div>
  );
}
