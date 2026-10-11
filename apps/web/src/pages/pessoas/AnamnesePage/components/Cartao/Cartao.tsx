import type { ReactNode } from 'react';

export interface CartaoProps {
  children: ReactNode;
}

export function Cartao({ children }: CartaoProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}
