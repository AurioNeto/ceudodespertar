import type { ReactNode } from 'react';
import { AmountDisplay, Rotulo } from '@/ds';

export interface SecaoProps {
  titulo: string;
  total: number;
  nota: string;
  children: ReactNode;
}

export function Secao({ titulo, total, nota, children }: SecaoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
        <Rotulo>{titulo}</Rotulo>
        <span style={{ flex: 1 }} />
        <AmountDisplay value={total / 100} size="sm" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>{nota}</span>
    </div>
  );
}
