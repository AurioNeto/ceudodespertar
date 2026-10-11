import type { ReactNode } from 'react';
import { Icon } from '@/ds';

export interface ColunaProps {
  titulo: string;
  icone: 'arrow-down-left' | 'arrow-up-right' | 'sparkles';
  cor: string;
  contagem: number;
  nota: string;
  children: ReactNode;
}

export function Coluna({ titulo, icone, cor, contagem, nota, children }: ColunaProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Icon name={icone} size={18} color={cor} />
          <span style={{ flex: 1, font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{titulo}</span>
          <span data-numeric style={{ font: 'var(--text-amount)', color: cor }}>
            {contagem}
          </span>
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
        <div style={{ height: 2, background: cor, opacity: 0.28, borderRadius: 2 }} />
      </header>
      {children}
    </section>
  );
}
