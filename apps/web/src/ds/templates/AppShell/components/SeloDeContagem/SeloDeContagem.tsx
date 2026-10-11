import type { CSSProperties } from 'react';

export function SeloDeContagem({ count, style }: { count: number | undefined; style?: CSSProperties }) {
  if (!count) return null;
  return (
    <span
      data-numeric
      style={{
        font: '600 11.5px var(--font-data)',
        background: 'var(--color-pending-soft)',
        color: 'var(--color-pending)',
        borderRadius: 'var(--radius-pill)',
        padding: '1px 7px',
        ...style,
      }}
    >
      {count}
    </span>
  );
}
