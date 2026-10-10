import type { CSSProperties, ReactNode } from 'react';

export function Cartao({
  children,
  campo = false,
  style,
  as: Elemento = 'div',
  'aria-label': rotuloAcessivel,
}: {
  children: ReactNode;
  campo?: boolean;
  style?: CSSProperties;
  as?: 'div' | 'article';
  'aria-label'?: string;
}) {
  return (
    <Elemento
      aria-label={rotuloAcessivel}
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '18px 20px',
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
