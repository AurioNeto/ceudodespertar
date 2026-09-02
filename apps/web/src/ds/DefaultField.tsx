import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { Density } from './Button';

export interface DefaultFieldProps {
  label: string;
  value: ReactNode;
  /** De onde veio o padrão: "última conta usada", "lido do comprovante". */
  origin?: string;
  onEdit?: () => void;
  density?: Density;
  style?: CSSProperties;
}

export function DefaultField({ label, value, origin, onEdit, density = 'field', style }: DefaultFieldProps) {
  return (
    <button
      type="button"
      onClick={onEdit}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '9px 13px',
        cursor: 'pointer',
        ...style,
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-field-label)',
          }}
        >
          {label}
        </span>
        <span style={{ display: 'block', font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {value}
        </span>
      </span>
      {origin ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{origin}</span> : null}
      <Icon name="pencil" size={16} color="var(--color-royal)" />
    </button>
  );
}
