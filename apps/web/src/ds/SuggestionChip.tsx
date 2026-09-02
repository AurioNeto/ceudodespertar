import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import type { Density } from './Button';

export interface SuggestionChipProps {
  children: ReactNode;
  onAccept?: () => void;
  onDismiss?: () => void;
  density?: Density;
  style?: CSSProperties;
}

/** Violeta do ápice: o sistema propõe, o humano confirma (Doc 1 §5.3). */
export function SuggestionChip({ children, onAccept, onDismiss, density = 'field', style }: SuggestionChipProps) {
  const alvo = density === 'field' ? 'var(--target-field)' : 'var(--target-office)';
  const botao: CSSProperties = {
    minWidth: 'var(--tap-min)',
    minHeight: 'var(--tap-min)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-pill)',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--color-suggest-soft)',
        border: '1px dashed var(--color-suggest-border)',
        color: 'var(--color-suggest)',
        borderRadius: 'var(--radius-pill)',
        padding: density === 'field' ? '0 6px 0 14px' : '0 4px 0 12px',
        minHeight: alvo,
        font: '600 13.5px var(--font-body)',
        ...style,
      }}
    >
      <Icon name="sparkles" size={15} />
      <span>{children}</span>
      {onAccept ? (
        <button
          type="button"
          onClick={onAccept}
          title="Aceitar sugestão"
          style={{ ...botao, color: 'var(--color-suggest)' }}
        >
          <Icon name="check" size={18} />
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          title="Descartar sugestão"
          style={{ ...botao, color: 'var(--text-meta)' }}
        >
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </span>
  );
}
