import type { CSSProperties, ReactNode } from 'react';

export interface ActionBarProps {
  children: ReactNode;
  note?: string;
  sticky?: boolean;
  style?: CSSProperties;
}

export function ActionBar({ children, note, sticky = true, style }: ActionBarProps) {
  return (
    <div
      style={{
        position: sticky ? 'sticky' : 'static',
        bottom: 0,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--color-line)',
        padding: '12px 20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: sticky ? '0 -6px 18px -14px rgba(59,38,23,.4)' : 'none',
        ...style,
      }}
    >
      {note ? (
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', textAlign: 'center' }}>{note}</p>
      ) : null}
      <div style={{ display: 'flex', gap: 10 }}>{children}</div>
    </div>
  );
}
