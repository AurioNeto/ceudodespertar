import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

interface PeriodLockBaseProps {
  title: string;
  reason: string;
  style?: CSSProperties;
}

export interface PeriodLockClosedProps extends PeriodLockBaseProps {
  canReopen?: false;
  reopenDeniedNote: string;
}

export interface PeriodLockReopenableProps extends PeriodLockBaseProps {
  canReopen: true;
  reopenLabel: string;
  onReopen?: () => void;
}

export type PeriodLockProps = PeriodLockClosedProps | PeriodLockReopenableProps;

export function PeriodLock(props: PeriodLockProps) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '15px 16px',
        display: 'flex',
        gap: 13,
        ...props.style,
      }}
    >
      <Icon name="lock" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-title)' }}>{props.title}</div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{props.reason}</p>
        {props.canReopen ? (
          <div style={{ marginTop: 11 }}>
            <Button variant="ghost" iconName="lock-open" onClick={props.onReopen}>
              {props.reopenLabel}
            </Button>
          </div>
        ) : (
          <p style={{ marginTop: 9, font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            {props.reopenDeniedNote}
          </p>
        )}
      </div>
    </div>
  );
}
