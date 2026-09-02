import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export interface PeriodLockProps {
  period: string;
  reason: string;
  canReopen?: boolean;
  onReopen?: () => void;
  style?: CSSProperties;
}

export function PeriodLock({ period, reason, canReopen = false, onReopen, style }: PeriodLockProps) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        display: 'flex',
        gap: 13,
        ...style,
      }}
    >
      <Icon name="lock" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-title)' }}>
          Período {period} está fechado
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{reason}</p>
        {canReopen ? (
          <div style={{ marginTop: 11 }}>
            <Button variant="ghost" iconName="lock-open" onClick={onReopen}>
              Reabrir período
            </Button>
          </div>
        ) : (
          <p style={{ marginTop: 9, font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Reabrir exige um administrador, e o motivo fica registrado de forma permanente.
          </p>
        )}
      </div>
    </div>
  );
}
