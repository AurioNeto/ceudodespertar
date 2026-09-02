import { useState } from 'react';
import type { CSSProperties } from 'react';
import { formatarValor } from '../lib/formato';

export interface AmountInputProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
  style?: CSSProperties;
}

/**
 * Aceita expressão somada ("40+25,50"): o valor composto é reconhecido na hora
 * e vira pendência na conferência, em vez de travar o registro (Doc 1 §5.3).
 */
export function AmountInput({ label = 'Quanto foi', value = '', onChange, hint, style }: AmountInputProps) {
  const [interno, setInterno] = useState(value);
  const val = onChange ? value : interno;
  const set = (x: string) => (onChange ? onChange(x) : setInterno(x));

  const composto = val.includes('+');
  const total = composto
    ? val.split('+').reduce((soma, parcela) => soma + (parseFloat(parcela.replace(',', '.')) || 0), 0)
    : null;

  return (
    <div
      style={{
        background: 'var(--bg-brand)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px 16px',
        ...style,
      }}
    >
      <span
        style={{
          display: 'block',
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-field-label)',
          marginBottom: 6,
        }}
      >
        {label}
      </span>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
        <span style={{ font: '500 24px var(--font-data)', color: 'var(--text-meta)' }}>R$</span>
        <input
          inputMode="decimal"
          value={val}
          placeholder="0,00"
          aria-label={label}
          onChange={(e) => set(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            background: 'transparent',
            outline: 'none',
            font: 'var(--text-amount-hero)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
            padding: 0,
          }}
        />
      </div>

      <div
        style={{
          height: 1,
          marginTop: 8,
          background: 'repeating-linear-gradient(to right,var(--color-line-gold) 0 4px,transparent 4px 8px)',
        }}
      />

      {total != null ? (
        <div style={{ marginTop: 9, font: 'var(--text-small)', color: 'var(--color-royal-ink)' }}>
          Soma reconhecida:{' '}
          <b data-numeric style={{ font: 'var(--text-amount)' }}>
            {formatarValor(total)}
          </b>{' '}
          — o valor composto vira pendência na conferência.
        </div>
      ) : hint ? (
        <div style={{ marginTop: 9, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{hint}</div>
      ) : null}
    </div>
  );
}
