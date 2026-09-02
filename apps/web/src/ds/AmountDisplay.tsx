import type { CSSProperties } from 'react';
import { formatarValor } from '../lib/formato';

export type NaturezaVisual = 'receita' | 'despesa' | 'neutral';
export type AmountSize = 'sm' | 'md' | 'lg' | 'hero';

const SIZES: Record<AmountSize, CSSProperties> = {
  sm: { font: 'var(--text-amount)' },
  md: { font: 'var(--text-amount)', fontSize: '16.5px' },
  lg: { font: 'var(--text-amount-lg)' },
  hero: { font: 'var(--text-amount-hero)', letterSpacing: 'var(--tracking-amount)' },
};

const COLORS: Record<NaturezaVisual, string> = {
  despesa: 'var(--color-attention)',
  receita: 'var(--color-confirmed)',
  neutral: 'var(--text-primary)',
};

const SIGNS: Record<NaturezaVisual, string> = {
  despesa: '− ',
  receita: '+ ',
  neutral: '',
};

export interface AmountDisplayProps {
  /** Em reais — a formatação pt-BR acontece aqui. */
  value: number;
  nature?: NaturezaVisual;
  size?: AmountSize;
  currency?: boolean;
  style?: CSSProperties;
}

export function AmountDisplay({
  value,
  nature = 'neutral',
  size = 'md',
  currency = true,
  style,
}: AmountDisplayProps) {
  return (
    <span
      data-numeric
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 6,
        color: COLORS[nature],
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        ...SIZES[size],
        ...style,
      }}
    >
      {currency ? <span style={{ opacity: 0.55, fontSize: '.7em' }}>R$</span> : null}
      <span>
        {SIGNS[nature]}
        {formatarValor(value)}
      </span>
    </span>
  );
}
