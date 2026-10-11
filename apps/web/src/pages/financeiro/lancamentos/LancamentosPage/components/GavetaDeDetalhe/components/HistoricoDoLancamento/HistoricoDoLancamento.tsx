import { rotuloLabel } from '../../../../constantes';
import type { EntradaDoHistorico } from '../../utils/historicoDoLancamento';

export interface HistoricoDoLancamentoProps {
  historico: readonly EntradaDoHistorico[];
}

export function HistoricoDoLancamento({ historico }: HistoricoDoLancamentoProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={rotuloLabel}>Histórico</span>
      {historico.map((h) => (
        <div key={h.texto} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span
            style={{
              font: 'var(--text-code)',
              color: 'var(--text-meta)',
              fontVariantNumeric: 'tabular-nums',
              flex: '0 0 auto',
            }}
          >
            {h.quando}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{h.texto}</span>
        </div>
      ))}
    </div>
  );
}
