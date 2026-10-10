import type { CSSProperties } from 'react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';

export interface InfraErrorProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  style?: CSSProperties;
}

export function InfraError({ title = 'Não deu para carregar', description, onRetry, style }: InfraErrorProps) {
  return (
    <div
      style={{
        background: 'var(--color-pending-soft)',
        border: '1px solid var(--color-pending-border)',
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        display: 'flex',
        gap: 13,
        ...style,
      }}
    >
      <Icon name="wifi-off" size={19} color="var(--color-pending)" style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{title}</div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{description}</p>
        {onRetry ? (
          <div style={{ marginTop: 11 }}>
            <Button variant="quiet" iconName="rotate-cw" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
