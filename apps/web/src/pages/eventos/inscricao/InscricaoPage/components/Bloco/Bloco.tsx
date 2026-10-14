import type { ReactNode } from 'react';
import { Cartao, Rotulo, type Density } from '@/ds';

export interface BlocoProps {
  titulo: string;
  densidade: Density;
  children: ReactNode;
}

export function Bloco({ titulo, densidade, children }: BlocoProps) {
  return (
    <Cartao density={densidade} style={{ gap: 12 }}>
      <Rotulo>{titulo}</Rotulo>
      {children}
    </Cartao>
  );
}
