import { StatusBadge } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel } from '../../constantes';

export interface HistoricoDeFechamentosProps {
  historico: readonly { periodo: string; meta: string; resultado: number }[];
}

export function HistoricoDeFechamentos({ historico }: HistoricoDeFechamentosProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={rotuloLabel}>Meses anteriores</span>
      {historico.map((h) => (
        <div
          key={h.periodo}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '11px 14px',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{h.periodo}</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{h.meta}</span>
          </div>
          <StatusBadge tone="confirmed">Fechado</StatusBadge>
          <span
            style={{
              font: 'var(--text-amount)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: h.resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
            }}
          >
            {h.resultado >= 0 ? '+ ' : '− '}
            {formatarDinheiro(Math.abs(h.resultado))}
          </span>
        </div>
      ))}
    </div>
  );
}
