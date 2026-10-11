import type { ReactNode } from 'react';
import { Rotulo, type Density } from '@/ds';

export function Secao({
  titulo,
  nota,
  densidade,
  children,
}: {
  titulo: string;
  nota?: string;
  densidade: Density;
  children: ReactNode;
}) {
  const campo = densidade === 'field';
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: campo ? 8 : 9, minWidth: 0 }}>
      <Rotulo>{titulo}</Rotulo>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      {children}
    </section>
  );
}
