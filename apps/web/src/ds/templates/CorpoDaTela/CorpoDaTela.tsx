import type { ReactNode } from 'react';
import type { Density } from '../../fundacao/densidade';

export interface CorpoDaTelaProps {
  densidade: Density;
  larguraMaxima?: number;
  espaco?: 'compacto' | 'padrao';
  children: ReactNode;
}

export function CorpoDaTela({ densidade, larguraMaxima, espaco = 'padrao', children }: CorpoDaTelaProps) {
  const campo = densidade === 'field';
  const compacto = espaco === 'compacto';
  const gapDoCampo = compacto ? 12 : 14;
  const gapDoEscritorio = compacto ? 16 : 18;

  return (
    <div
      style={{
        padding: campo ? '14px 16px 24px' : '18px 24px 30px',
        display: 'flex',
        flexDirection: 'column',
        gap: campo ? gapDoCampo : gapDoEscritorio,
        maxWidth: campo ? undefined : larguraMaxima,
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}
