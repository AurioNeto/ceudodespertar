import type { ReactNode } from 'react';
import { Rotulo } from '@/ds';

export interface LinhaProps {
  rotulo: string;
  children: ReactNode;
}

export function Linha({ rotulo, children }: LinhaProps) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{children}</span>
    </span>
  );
}
