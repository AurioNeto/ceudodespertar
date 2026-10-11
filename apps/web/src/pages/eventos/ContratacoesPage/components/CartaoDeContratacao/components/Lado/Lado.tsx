import type { ReactNode } from 'react';
import { Rotulo } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';

export interface LadoProps {
  titulo: string;
  categoria: string;
  natureza: string;
  cor: string;
  total: number;
  nota: string;
  children: ReactNode;
}

export function Lado({
  titulo,
  categoria,
  natureza,
  cor,
  total,
  nota,
  children,
}: LadoProps) {
  return (
    <div
      style={{
        border: '1px solid var(--color-line)',
        borderLeft: `var(--edge-state) solid ${cor}`,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        minWidth: 0,
      }}
    >
      <Rotulo>{titulo}</Rotulo>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 9px', alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-amount)', color: cor }}>
          {formatarBRL(total)}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{natureza}</span>
      </div>
      <code style={{ font: 'var(--text-code)', alignSelf: 'flex-start' }}>{categoria}</code>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      {children}
    </div>
  );
}
