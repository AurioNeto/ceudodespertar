import type { CSSProperties } from 'react';
import { SINAL_NEGATIVO, SINAL_POSITIVO, formatarValor } from '@/lib/formato';

export type NaturezaVisual = 'receita' | 'despesa' | 'neutral';
export type AmountSize = 'sm' | 'md' | 'lg' | 'hero';
export type SinalDoValor = 'negativo' | 'sempre';

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
  despesa: SINAL_NEGATIVO,
  receita: SINAL_POSITIVO,
  neutral: '',
};

function sinalDoValor(value: number, nature: NaturezaVisual, sinal: SinalDoValor): string {
  if (nature !== 'neutral') return SIGNS[nature];
  if (value < 0) return SINAL_NEGATIVO;
  return sinal === 'sempre' && value > 0 ? SINAL_POSITIVO : '';
}

export interface AmountDisplayProps {
  /** Em reais — a formatação pt-BR acontece aqui. */
  value: number;
  nature?: NaturezaVisual;
  size?: AmountSize;
  currency?: boolean;
  sinal?: SinalDoValor;
  style?: CSSProperties;
}

export function AmountDisplay({
  value,
  nature = 'neutral',
  size = 'md',
  currency = true,
  sinal = 'negativo',
  style,
}: AmountDisplayProps) {
  const prefixo = sinalDoValor(value, nature, sinal);
  const numero = nature === 'neutral' ? Math.abs(value) : value;
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
      {prefixo ? <span>{prefixo}</span> : null}
      {currency ? <span style={{ opacity: 0.55, fontSize: '.7em' }}>R$</span> : null}
      <span>{formatarValor(numero)}</span>
    </span>
  );
}
