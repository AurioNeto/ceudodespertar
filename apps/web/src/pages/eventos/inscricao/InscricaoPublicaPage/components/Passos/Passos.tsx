import type { ReactNode } from 'react';

export interface PassosProps {
  titulo: string;
  recado: string;
  children: ReactNode;
}

export function Passos({ titulo, recado, children }: PassosProps) {
  return (
    <>
      <div>
        <h1 style={{ font: 'var(--text-display)', color: 'var(--text-title)' }}>{titulo}</h1>
        <p style={{ marginTop: 8, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '58ch' }}>
          {recado}
        </p>
      </div>
      {children}
    </>
  );
}
