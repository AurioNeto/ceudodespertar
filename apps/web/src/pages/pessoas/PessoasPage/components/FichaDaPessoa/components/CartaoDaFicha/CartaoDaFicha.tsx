import type { ReactNode } from 'react';
import { Cartao } from '@/ds';

export interface CartaoDaFichaProps {
  titulo: string;
  nota?: string;
  children: ReactNode;
}

export function CartaoDaFicha({ titulo, nota, children }: CartaoDaFichaProps) {
  return (
    <Cartao>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      </div>
      {children}
    </Cartao>
  );
}
