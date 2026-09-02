import type { CSSProperties, ReactNode } from 'react';
import { AmountDisplay } from './AmountDisplay';

/** A régua pontilhada do recibo diz a natureza do lançamento (chat 3). */
export type ReceiptTone = 'entrada' | 'saida' | 'transferencia';

const REGUA: Record<ReceiptTone, string> = {
  entrada: 'var(--color-confirmed)',
  saida: 'var(--color-attention)',
  transferencia: 'var(--color-royal)',
};

export interface ReceiptLine {
  label: string;
  value: ReactNode;
}

export interface ReceiptProps {
  title?: string;
  /** Em reais. */
  amount?: number | null;
  tone?: ReceiptTone;
  lines?: readonly ReceiptLine[];
  footnote?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Receipt({
  title = 'Registrado',
  amount,
  tone = 'entrada',
  lines = [],
  footnote,
  children,
  style,
}: ReceiptProps) {
  const cor = REGUA[tone];
  const natureza = tone === 'saida' ? 'despesa' : tone === 'entrada' ? 'receita' : 'neutral';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 20px 18px',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 4,
          background: `repeating-linear-gradient(to right,${cor} 0 6px,transparent 6px 12px)`,
        }}
      />
      <div
        style={{
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: cor,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      {amount != null ? <AmountDisplay value={amount} nature={natureza} size="hero" /> : null}

      <dl style={{ margin: '16px 0 0', display: 'grid', gap: 7 }}>
        {lines.map((l) => (
          <div
            key={l.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              borderBottom: '1px solid var(--border-brand)',
              paddingBottom: 6,
            }}
          >
            <dt
              style={{
                font: 'var(--text-label)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--text-field-label)',
              }}
            >
              {l.label}
            </dt>
            <dd style={{ margin: 0, font: 'var(--text-body-strong)', color: 'var(--text-primary)', textAlign: 'right' }}>
              {l.value}
            </dd>
          </div>
        ))}
      </dl>

      {footnote ? (
        <p style={{ marginTop: 14, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{footnote}</p>
      ) : null}
      {children}
    </div>
  );
}
