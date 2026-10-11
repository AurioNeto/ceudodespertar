import type { ReactNode } from 'react';
import type { Adiantamento } from '@cdd/contracts';
import { StatusBadge, type Density } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { ROTULO, TOM } from './constantes';

export interface LinhaProps {
  adiantamento: Adiantamento;
  densidade: Density;
  idade?: number;
  children?: ReactNode;
}

export function Linha({ adiantamento, densidade, idade, children }: LinhaProps) {
  const campo = densidade === 'field';
  const a = adiantamento;
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: `var(--edge-state) solid ${
          a.status === 'AGUARDANDO_AUTORIZACAO'
            ? 'var(--color-pending)'
            : a.status === 'AUTORIZADO'
              ? 'var(--color-royal)'
              : a.status === 'RECUSADO'
                ? 'var(--color-attention)'
                : 'var(--color-confirmed)'
        }`,
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: campo ? '13px 14px' : '14px 17px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{a.pessoaNome}</span>
          <StatusBadge tone={TOM[a.status]}>{ROTULO[a.status]}</StatusBadge>
          {idade !== undefined && idade > 30 ? <StatusBadge tone="attention">há {idade} dias</StatusBadge> : null}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {a.motivo} · {formatarData(a.dataDespesa)} · {a.contaOrigemNome}
        </span>
        {a.autorizadoPorNome ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            autorizado por {a.autorizadoPorNome} em {formatarData(a.autorizadoEm!)}
            {a.ressarcidoEm ? ` · ressarcido em ${formatarData(a.ressarcidoEm)} por ${a.contaRessarcimentoNome}` : ''}
          </span>
        ) : null}
        {a.recusaMotivo ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>recusado: {a.recusaMotivo}</span>
        ) : null}
      </div>

      <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--text-primary)' }}>
        {formatarDinheiro(a.valor)}
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</div>
    </div>
  );
}
