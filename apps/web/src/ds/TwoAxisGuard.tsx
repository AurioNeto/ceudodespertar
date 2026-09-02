import type { CSSProperties } from 'react';
import { Icon } from './Icon';

export interface TwoAxisGuardProps {
  title?: string;
  explanation: string;
  /** O que seria preciso para poder: papel de domínio, autorização, grupo. */
  requirement?: string;
  style?: CSSProperties;
}

/** Doc 3, A1: papel e permissão são eixos independentes. Estado legítimo, não erro. */
export function TwoAxisGuard({
  title = 'Você tem acesso a esta tela, mas não a esta operação',
  explanation,
  requirement,
  style,
}: TwoAxisGuardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--color-royal-border)',
        borderTop: 'var(--edge-state) solid var(--color-royal)',
        borderRadius: '0 0 var(--radius) var(--radius)',
        padding: '18px 18px 16px',
        display: 'flex',
        gap: 14,
        ...style,
      }}
    >
      <Icon name="shield-half" size={22} color="var(--color-royal)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{title}</div>
        <p style={{ marginTop: 7, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '58ch' }}>
          {explanation}
        </p>
        {requirement ? (
          <p
            style={{
              marginTop: 10,
              font: 'var(--text-small)',
              color: 'var(--color-royal-ink)',
              background: 'var(--color-royal-soft)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 11px',
              display: 'inline-block',
            }}
          >
            {requirement}
          </p>
        ) : null}
      </div>
    </div>
  );
}
