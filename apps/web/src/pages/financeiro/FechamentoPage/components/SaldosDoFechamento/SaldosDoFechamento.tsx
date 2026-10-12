import type { Conta } from '@cdd/contracts';
import { AmountDisplay, Rotulo } from '@/ds';

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
        borderRadius: 'var(--leaf-lg)',
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
          <AmountDisplay value={c.saldo / 100} size="sm" />
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
        <AmountDisplay value={totalSaldos / 100} size="lg" style={{ color: 'var(--color-royal-deep)' }} />
      </div>
    </div>
  );
}
