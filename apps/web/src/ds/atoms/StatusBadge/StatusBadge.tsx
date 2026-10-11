import type { CSSProperties, ReactNode } from 'react';
import { TONES } from './constantes';

export type BadgeTone = 'pending' | 'confirmed' | 'attention' | 'neutral' | 'suggest' | 'royal';

export interface StatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  count?: number;
  style?: CSSProperties;
}

export function StatusBadge({ tone = 'pending', children, count, style }: StatusBadgeProps) {
  const t = TONES[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 'var(--radius-pill)',
        padding: '4px 11px',
        font: '600 12px var(--font-body)',
        background: t.bg,
        color: t.fg,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
      {count != null ? (
        <span data-numeric style={{ font: '600 11.5px var(--font-data)', opacity: 0.75 }}>
          {count}
        </span>
      ) : null}
    </span>
  );
}
