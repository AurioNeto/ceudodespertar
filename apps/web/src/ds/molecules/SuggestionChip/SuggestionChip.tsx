import type { CSSProperties, ReactNode } from 'react';
import { BotaoDeIcone } from '../../atoms/BotaoDeIcone';
import { Icon } from '../../atoms/Icon';
import type { Density } from '../../fundacao/densidade';

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
        <BotaoDeIcone
          icone="check"
          onClick={onAccept}
          title="Aceitar sugestão"
          style={{ borderRadius: 'var(--radius-pill)', color: 'var(--color-suggest)' }}
        />
      ) : null}
      {onDismiss ? (
        <BotaoDeIcone
          icone="x"
          tamanhoDoIcone={16}
          onClick={onDismiss}
          title="Descartar sugestão"
          style={{ borderRadius: 'var(--radius-pill)' }}
        />
      ) : null}
    </span>
  );
}
