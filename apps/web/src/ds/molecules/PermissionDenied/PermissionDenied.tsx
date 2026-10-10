import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../../atoms/Icon';

export interface PermissionDeniedProps {
  title: ReactNode;
  description: ReactNode;
  style?: CSSProperties;
}

export function PermissionDenied({ title, description, style }: PermissionDeniedProps) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderRadius: 'var(--radius)',
        padding: '17px 18px',
        display: 'flex',
        gap: 13,
        ...style,
      }}
    >
      <Icon name="ban" size={20} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{title}</div>
        <p style={{ marginTop: 7, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '58ch' }}>
          {description}
        </p>
      </div>
    </div>
  );
}
