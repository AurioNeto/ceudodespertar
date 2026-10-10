import type { CSSProperties, ReactNode } from 'react';
import { FlowerOfLife } from '../../atoms/FlowerOfLife';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  style?: CSSProperties;
}

export function EmptyState({ title, description, action, style }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '44px 24px',
        background: 'var(--bg-card)',
        border: '1px dashed var(--color-line-gold)',
        borderRadius: 'var(--radius-lg)',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <FlowerOfLife />
      <h3 style={{ position: 'relative', font: '700 18px var(--font-display)', color: 'var(--text-title)' }}>
        {title}
      </h3>
      {description ? (
        <p
          style={{
            position: 'relative',
            margin: '7px auto 0',
            maxWidth: '34ch',
            font: 'var(--text-small)',
            color: 'var(--text-secondary)',
          }}
        >
          {description}
        </p>
      ) : null}
      {action ? <div style={{ position: 'relative', marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}
