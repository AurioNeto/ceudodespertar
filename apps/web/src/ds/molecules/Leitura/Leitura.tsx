import type { ReactNode } from 'react';
import { Rotulo } from '../../atoms/Rotulo';

export interface LeituraProps {
  rotulo: string;
  valor: ReactNode;
  nota?: string;
  tamanho?: 'corpo' | 'pequeno';
}

export function Leitura({ rotulo, valor, nota, tamanho = 'corpo' }: LeituraProps) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ font: tamanho === 'corpo' ? 'var(--text-body)' : 'var(--text-small)', color: 'var(--text-primary)' }}>
        {valor}
      </span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
    </span>
  );
}
