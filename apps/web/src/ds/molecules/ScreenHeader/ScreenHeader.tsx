import type { CSSProperties, ReactNode } from 'react';
import type { Density } from '../../fundacao/densidade';
import { useCabecalhoReduzido } from './hooks/useCabecalhoReduzido';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  density?: Density;
  style?: CSSProperties;
}

const FOLGA_PARA_REDUZIR = 120;

export function ScreenHeader({ title, subtitle, actions, density = 'office', style }: ScreenHeaderProps) {
  const { sentinela, reduzido } = useCabecalhoReduzido();
  const campo = density === 'field';
  const respiroCompleto = campo ? '17px 20px 16px' : '21px 24px 20px';
  const respiroReduzido = campo ? '8px 20px' : '8px 24px';

  return (
    <>
      <div
        aria-hidden="true"
        ref={sentinela}
        style={{ height: FOLGA_PARA_REDUZIR, marginBottom: -FOLGA_PARA_REDUZIR, pointerEvents: 'none' }}
      />
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          background: 'var(--bg-glass)',
          backdropFilter: 'var(--glass)',
          WebkitBackdropFilter: 'var(--glass)',
          borderBottom: '1px solid var(--color-line)',
          padding: reduzido ? respiroReduzido : respiroCompleto,
          transition: 'padding var(--motion)',
          display: 'flex',
          gap: 20,
          alignItems: reduzido ? 'center' : 'flex-end',
          flexWrap: 'wrap',
          ...style,
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            tabIndex={-1}
            style={
              reduzido
                ? { font: 'var(--text-body-strong)', color: 'var(--text-title)' }
                : { font: 'var(--text-display)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }
            }
          >
            {title}
          </h1>
          {!reduzido && subtitle ? (
            <p style={{ marginTop: 7, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {!reduzido && actions ? <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div> : null}
      </header>
    </>
  );
}
