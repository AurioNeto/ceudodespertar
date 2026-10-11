import { rotuloLabel } from '../../constantes';

export interface KpiProps {
  rotulo: string;
  valor: string;
  nota: string;
  cor?: string;
}

export function Kpi({ rotulo, valor, nota, cor = 'var(--color-royal-deep)' }: KpiProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
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
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}
