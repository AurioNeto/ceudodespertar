import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AmountDisplay, type NaturezaVisual } from './AmountDisplay';
import type { Density } from './Button';

export type RecordStatus = 'pending' | 'confirmed' | 'reversed';

/** A barra de estado à esquerda é a assinatura do sistema (tokens, --edge-state). */
const EDGE: Record<RecordStatus, string> = {
  pending: 'var(--color-pending)',
  confirmed: 'var(--color-confirmed)',
  reversed: 'var(--color-neutral)',
};

export interface RecordRowProps {
  description: ReactNode;
  /** Em reais. */
  amount: number;
  nature?: NaturezaVisual;
  meta?: ReactNode;
  status?: RecordStatus;
  badges?: ReactNode;
  selected?: boolean;
  density?: Density;
  onClick?: () => void;
  style?: CSSProperties;
  children?: ReactNode;
}

export function RecordRow({
  description,
  amount,
  nature = 'despesa',
  meta,
  status = 'pending',
  badges,
  selected = false,
  density = 'field',
  onClick,
  style,
  children,
}: RecordRowProps) {
  const [hot, setHot] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: selected ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: density === 'field' ? '13px 15px 13px 17px' : '11px 14px 11px 16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: hot && onClick ? 'var(--shadow-raised)' : 'none',
        transition: 'box-shadow var(--motion-fast), background var(--motion-fast)',
        ...style,
      }}
    >
      <span
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 'var(--edge-state)', background: EDGE[status] }}
      />
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline' }}>
        <span style={{ font: '600 15px var(--font-body)', color: 'var(--text-primary)' }}>{description}</span>
        <AmountDisplay value={amount} nature={nature} size="md" />
      </span>
      {meta ? (
        <span style={{ display: 'block', marginTop: 4, font: '500 12px var(--font-data)', color: 'var(--text-meta)' }}>
          {meta}
        </span>
      ) : null}
      {badges ? <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>{badges}</span> : null}
      {children}
    </button>
  );
}
