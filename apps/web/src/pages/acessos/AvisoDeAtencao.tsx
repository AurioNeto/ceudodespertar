import type { ReactNode } from 'react';

export interface AvisoDeAtencaoProps {
  readonly id?: string;
  readonly role?: 'status';
  readonly children: ReactNode;
}

export function AvisoDeAtencao({ id, role, children }: AvisoDeAtencaoProps) {
  return (
    <p
      id={id}
      role={role}
      style={{
        margin: 0,
        padding: 'var(--space-3)',
        font: 'var(--text-small)',
        color: 'var(--text-primary)',
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderRadius: 'var(--radius)',
      }}
    >
      {children}
    </p>
  );
}
