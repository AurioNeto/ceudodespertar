import type { CSSProperties } from 'react';
import { Icon } from './Icon';

export interface SheetOption {
  value: string;
  label: string;
  meta?: string;
}

export interface BottomSheetProps {
  open?: boolean;
  title?: string;
  options?: readonly SheetOption[];
  value?: string | null;
  onSelect?: (value: string) => void;
  onClose?: () => void;
  style?: CSSProperties;
}

export function BottomSheet({
  open = true,
  title,
  options = [],
  value,
  onSelect,
  onClose,
  style,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(59,38,23,.38)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 40,
        ...style,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          boxShadow: 'var(--shadow-sheet)',
          padding: '8px 0 14px',
          maxHeight: '78%',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0 10px' }}>
          <span style={{ width: 42, height: 4, borderRadius: 2, background: 'var(--color-line-strong)' }} />
        </div>

        {title ? (
          <div
            style={{
              padding: '0 20px 10px',
              font: 'var(--text-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-field-label)',
            }}
          >
            {title}
          </div>
        ) : null}

        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect?.(o.value)}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
                minHeight: 'var(--target-field)',
                padding: '0 20px',
                background: on ? 'var(--color-royal-soft)' : 'transparent',
                borderTop: 'var(--border-hairline)',
              }}
            >
              <span style={{ flex: 1 }}>
                <span
                  style={{
                    display: 'block',
                    font: 'var(--text-body-lg)',
                    color: on ? 'var(--color-royal-ink)' : 'var(--text-primary)',
                  }}
                >
                  {o.label}
                </span>
                {o.meta ? (
                  <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {o.meta}
                  </span>
                ) : null}
              </span>
              {on ? <Icon name="check" size={19} color="var(--color-royal)" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
