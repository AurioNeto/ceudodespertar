import type { CSSProperties, ReactNode } from 'react';
import { AmountDisplay } from '../../atoms/AmountDisplay';
import { rotuloVersalete } from '../../fundacao/estilos';

/** A régua pontilhada do recibo diz a natureza do lançamento (chat 3). */
export type ReceiptTone = 'entrada' | 'saida' | 'transferencia';

const REGUA: Record<ReceiptTone, string> = {
  entrada: 'var(--on-paper-confirmed)',
  saida: 'var(--on-paper-attention)',
  transferencia: 'var(--on-paper-action)',
};

export interface ReceiptLine {
  label: string;
  value: ReactNode;
}

export interface ReceiptProps {
  title: string;
  /** Em reais. */
  amount?: number | null;
  tone?: ReceiptTone;
  lines?: readonly ReceiptLine[];
  footnote?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export function Receipt({
  title,
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
        background: 'var(--bg-paper)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--leaf-xl)',
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
          ...rotuloVersalete,
          color: 'var(--title-on-paper)',
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      {amount != null ? <AmountDisplay value={amount} nature={natureza} size="hero" style={{ color: 'var(--title-on-paper)' }} /> : null}

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
                ...rotuloVersalete,
                color: 'var(--label-on-paper)',
              }}
            >
              {l.label}
            </dt>
            <dd style={{ margin: 0, font: 'var(--text-body-strong)', color: 'var(--text-on-paper)', textAlign: 'right' }}>
              {l.value}
            </dd>
          </div>
        ))}
      </dl>

      {footnote ? (
        <p style={{ marginTop: 14, font: 'var(--text-small)', color: 'var(--text-on-paper)' }}>{footnote}</p>
      ) : null}
      {children}
    </div>
  );
}
