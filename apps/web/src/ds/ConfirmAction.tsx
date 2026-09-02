import type { CSSProperties } from 'react';
import { Button, type Density } from './Button';
import { Icon } from './Icon';

export interface ConfirmActionProps {
  label?: string;
  irreversibleNote?: string;
  /** Regras que impedem a confirmação, nomeadas em português (Doc 2, L2 e L7). */
  blockedBy?: readonly string[];
  density?: Density;
  onConfirm?: () => void;
  style?: CSSProperties;
}

export function ConfirmAction({
  label = 'Confirmar',
  irreversibleNote = 'Confirmar é irreversível. Depois disso, só estorno.',
  blockedBy = [],
  density = 'office',
  onConfirm,
  style,
}: ConfirmActionProps) {
  const blocked = blockedBy.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      {blocked ? (
        <div
          style={{
            background: 'var(--color-pending-soft)',
            border: '1px solid var(--color-pending-border)',
            borderLeft: 'var(--edge-state) solid var(--color-pending)',
            borderRadius: '0 var(--radius) var(--radius) 0',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <Icon name="triangle-alert" size={16} color="var(--color-pending)" />
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--color-pending)' }}>
              {blockedBy.length === 1 ? `Não dá para confirmar: ${blockedBy[0]}` : 'Não dá para confirmar ainda'}
            </span>
          </div>
          {blockedBy.length > 1 ? (
            <ul style={{ margin: 0, paddingLeft: 18, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {blockedBy.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{irreversibleNote}</p>
      )}

      <Button
        density={density}
        fullWidth={density === 'field'}
        iconName="check"
        disabled={blocked}
        onClick={onConfirm}
        blockedReason={blocked ? 'Resolva o que falta acima, ou pergunte a quem registrou.' : undefined}
      >
        {label}
      </Button>
    </div>
  );
}
