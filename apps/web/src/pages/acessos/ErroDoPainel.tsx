import type { ReactNode } from 'react';

export interface ErroDoPainelProps {
  readonly children: ReactNode;
}

export function ErroDoPainel({ children }: ErroDoPainelProps) {
  return (
    <p role="alert" style={{ margin: 0, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
      {children}
    </p>
  );
}
