import type { CSSProperties } from 'react';

/**
 * Estados de tela. A distinção é deliberada: erro de domínio explica a regra,
 * erro de infraestrutura oferece nova tentativa, e falta de permissão nomeia
 * o grupo e a permissão que falta (Doc 3 §11).
 */

export interface DomainErrorProps {
  rule: string;
  explanation?: string;
  /** O caminho que resta a quem esbarrou na regra. */
  way?: string;
  style?: CSSProperties;
}

export function DomainError({ rule, explanation, way, style }: DomainErrorProps) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: 'var(--leaf-md)',
        padding: '14px 16px',
        ...style,
      }}
    >
      <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rule}</div>
      {explanation ? (
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{explanation}</p>
      ) : null}
      {way ? (
        <p style={{ marginTop: 8, font: 'var(--text-small)', color: 'var(--color-royal-ink)' }}>{way}</p>
      ) : null}
    </div>
  );
}
