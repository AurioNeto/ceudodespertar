import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { TextField } from './TextField';

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
  reopenReasonLabel: string;
  reopenReasonRequiredNote: string;
  onReopen?: (reopenReason: string) => void;
}

export type PeriodLockProps = PeriodLockClosedProps | PeriodLockReopenableProps;

interface ReopenWithReasonProps {
  label: string;
  reasonLabel: string;
  reasonRequiredNote: string;
  onReopen?: (reopenReason: string) => void;
}

function ReopenWithReason({ label, reasonLabel, reasonRequiredNote, onReopen }: ReopenWithReasonProps) {
  const [typedReason, setTypedReason] = useState('');
  const reopenReason = typedReason.trim();
  const reasonMissing = reopenReason === '';

  return (
    <div style={{ marginTop: 11 }}>
      <TextField
        label={reasonLabel}
        multiline
        aria-required="true"
        value={typedReason}
        onChange={(event) => setTypedReason(event.target.value)}
      />
      <div style={{ marginTop: 11 }}>
        <Button
          variant="ghost"
          iconName="lock-open"
          disabled={reasonMissing}
          blockedReason={reasonRequiredNote}
          onClick={() => onReopen?.(reopenReason)}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

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
          <ReopenWithReason
            label={props.reopenLabel}
            reasonLabel={props.reopenReasonLabel}
            reasonRequiredNote={props.reopenReasonRequiredNote}
            onReopen={props.onReopen}
          />
        ) : (
          <p style={{ marginTop: 9, font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            {props.reopenDeniedNote}
          </p>
        )}
      </div>
    </div>
  );
}
