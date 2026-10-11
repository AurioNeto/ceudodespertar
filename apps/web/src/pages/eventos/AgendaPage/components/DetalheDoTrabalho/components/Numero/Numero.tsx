import { rotuloLabel } from '../../constantes';

export function Numero({
  rotulo,
  valor,
  nota,
  cor = 'var(--color-royal-deep)',
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  cor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '11px 13px',
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span
        style={{
          font: 'var(--text-amount-lg)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: cor,
        }}
      >
        {valor}
      </span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
    </div>
  );
}
