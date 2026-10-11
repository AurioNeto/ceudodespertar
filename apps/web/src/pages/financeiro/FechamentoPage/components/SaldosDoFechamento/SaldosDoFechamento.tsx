import type { Conta } from '@cdd/contracts';
import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel, valorGrande } from '../../constantes';

export interface SaldosDoFechamentoProps {
  contasAtivas: readonly Conta[];
  totalSaldos: number;
}

export function SaldosDoFechamento({ contasAtivas, totalSaldos }: SaldosDoFechamentoProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={rotuloLabel}>Saldo por conta que fica registrado no fechamento</span>
      {contasAtivas.map((c) => (
        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{c.nome}</span>
          <span
            style={{
              font: 'var(--text-amount)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
            }}
          >
            {formatarDinheiro(c.saldo)}
          </span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          borderTop: 'var(--border-hairline)',
          paddingTop: 10,
        }}
      >
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Total</span>
        <span style={{ ...valorGrande, color: 'var(--color-royal-deep)' }}>{formatarDinheiro(totalSaldos)}</span>
      </div>
    </div>
  );
}
