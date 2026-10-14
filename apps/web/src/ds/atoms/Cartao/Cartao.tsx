import type { CSSProperties, ReactNode } from 'react';
import type { Density } from '../../fundacao/densidade';

export function Cartao({
  children,
  density = 'office',
  style,
  as: Elemento = 'div',
  'aria-label': rotuloAcessivel,
}: {
  children: ReactNode;
  density?: Density;
  style?: CSSProperties;
  as?: 'div' | 'article';
  'aria-label'?: string;
}) {
  return (
    <Elemento
      aria-label={rotuloAcessivel}
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'var(--glass)',
        WebkitBackdropFilter: 'var(--glass)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-lg)',
        padding: density === 'field' ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </Elemento>
  );
}
