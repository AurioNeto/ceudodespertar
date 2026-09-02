import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'pending' | 'confirmed' | 'attention' | 'neutral' | 'suggest' | 'royal';

const TONES: Record<BadgeTone, { bg: string; fg: string; label: string }> = {
  pending: { bg: 'var(--color-pending-soft)', fg: 'var(--color-pending)', label: 'A conferir' },
  confirmed: { bg: 'var(--color-confirmed-soft)', fg: 'var(--color-confirmed)', label: 'Confirmado' },
  attention: { bg: 'var(--color-attention-soft)', fg: 'var(--color-attention)', label: 'Aguardando resposta' },
  neutral: { bg: 'var(--color-neutral-soft)', fg: 'var(--color-neutral)', label: 'Estornado' },
  suggest: { bg: 'var(--color-suggest-soft)', fg: 'var(--color-suggest)', label: 'Sugestão' },
  royal: { bg: 'var(--color-royal-soft)', fg: 'var(--color-royal-ink)', label: 'Conciliado' },
};

export interface StatusBadgeProps {
  tone?: BadgeTone;
  children?: ReactNode;
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
      {children ?? t.label}
      {count != null ? (
        <span data-numeric style={{ font: '600 11.5px var(--font-data)', opacity: 0.75 }}>
          {count}
        </span>
      ) : null}
    </span>
  );
}
