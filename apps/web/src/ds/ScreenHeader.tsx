import type { CSSProperties, ReactNode } from 'react';
import type { Density } from './Button';

export interface ScreenHeaderProps {
  /** Código da tela no mapa de telas (T-02, F-09...). */
  code?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  density?: Density;
  style?: CSSProperties;
}

export function ScreenHeader({ code, title, subtitle, actions, density = 'office', style }: ScreenHeaderProps) {
  return (
    <header
      style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--color-line)',
        borderTop: '2px solid var(--color-royal)',
        padding: density === 'field' ? '17px 20px 16px' : '21px 24px 20px',
        display: 'flex',
        gap: 20,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        {code ? (
          <div
            style={{
              font: 'var(--text-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-field-label)',
              marginBottom: 5,
            }}
          >
            {code}
          </div>
        ) : null}
        <h1 style={{ font: 'var(--text-display)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}>
          {title}
        </h1>
        {subtitle ? (
          <p style={{ marginTop: 7, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div> : null}
    </header>
  );
}
