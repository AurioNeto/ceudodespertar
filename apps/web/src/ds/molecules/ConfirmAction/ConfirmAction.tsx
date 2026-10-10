import type { CSSProperties } from 'react';
import { Button, type Density } from '../../Button';
import { Icon } from '../../atoms/Icon';

export interface ConfirmActionProps {
  label?: string;
  irreversibleNote: string;
  /** Regras que impedem a confirmação, nomeadas em português (Doc 2, L2 e L7). */
  blockedBy?: readonly string[];
  blockedGuidance: string;
  blockedHeadingForOneRule: string;
  blockedHeadingForManyRules: string;
  density?: Density;
  onConfirm?: () => void;
  style?: CSSProperties;
}

export function ConfirmAction({
  label = 'Confirmar',
  irreversibleNote,
  blockedBy = [],
  blockedGuidance,
  blockedHeadingForOneRule,
  blockedHeadingForManyRules,
  density = 'office',
  onConfirm,
  style,
}: ConfirmActionProps) {
  const [firstRule, ...otherRules] = blockedBy;
  const blocked = firstRule !== undefined;

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
              {otherRules.length === 0 ? (
                <>
                  {blockedHeadingForOneRule} <span>{firstRule}</span>
                </>
              ) : (
                blockedHeadingForManyRules
              )}
            </span>
          </div>
          {otherRules.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {blockedBy.map((rule, position) => (
                <li key={position}>{rule}</li>
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
        onClick={() => onConfirm?.()}
        blockedReason={blocked ? blockedGuidance : undefined}
      >
        {label}
      </Button>
    </div>
  );
}
