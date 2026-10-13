import type { ReactNode } from 'react';
import type { Density } from '@/ds';
import { vidroLeve } from '@/ds';

export interface CartaoDeFormularioProps {
  titulo: string;
  densidade: Density;
  children: ReactNode;
}

export function CartaoDeFormulario({ titulo, densidade, children }: CartaoDeFormularioProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        ...vidroLeve,
        border: '1px solid var(--color-royal-border)',
        borderLeft: 'var(--edge-state) solid var(--color-royal)',
        borderRadius: 'var(--leaf-md)',
        padding: densidade === 'field' ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
      }}
    >
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{titulo}</span>
      {children}
    </div>
  );
}
