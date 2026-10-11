import type { ReactNode } from 'react';
import { Cartao, Rotulo, type Density } from '@/ds';

export interface BlocoProps {
  titulo: string;
  densidade: Density;
  children: ReactNode;
}

export function Bloco({ titulo, densidade, children }: BlocoProps) {
  const campo = densidade === 'field';
  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>{titulo}</Rotulo>
      {children}
    </Cartao>
  );
}
