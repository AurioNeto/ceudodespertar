import type { LancamentoAConciliar } from '@cdd/contracts';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';

export interface LancamentoSozinhoProps {
  lancamento: LancamentoAConciliar;
}

export function LancamentoSozinho({ lancamento }: LancamentoSozinhoProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: 'var(--edge-state) solid var(--color-pending)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {formatarData(lancamento.data).slice(0, 5)}
        </span>
        <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {lancamento.motivo}
        </span>
        <span
          data-numeric
          style={{
            font: 'var(--text-amount)',
            color: lancamento.natureza === 'RECEITA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
          }}
        >
          {lancamento.natureza === 'RECEITA' ? '+ ' : '− '}
          {formatarDinheiro(lancamento.valor)}
        </span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {lancamento.conta} · {lancamento.registradoPorNome}
      </span>
    </div>
  );
}
