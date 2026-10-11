import type { Conta } from '@cdd/contracts';
import { formatarBRL } from '@/pages/utils/formato';
import { Rotulo } from '@/ds';
import { valorGrande } from '../../constantes';

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
      <Rotulo>Saldo por conta que fica registrado no fechamento</Rotulo>
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
            {formatarBRL(c.saldo)}
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
        <span style={{ ...valorGrande, color: 'var(--color-royal-deep)' }}>{formatarBRL(totalSaldos)}</span>
      </div>
    </div>
  );
}
