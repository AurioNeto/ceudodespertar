import type { Fatura } from '@cdd/contracts';
import { AmountDisplay, StatusBadge, fundoComVidro } from '@/ds';
import { competenciaPorExtenso, pluralizar } from '@/pages/utils/formato';
import { ROTULO, TOM } from '../../constantes';
import { totalDaFatura } from '../../utils/fatura';

export interface LinhaDaFaturaProps {
  fatura: Fatura;
  ativa: boolean;
  onAbrir: () => void;
}

export function LinhaDaFatura({ fatura, ativa, onAbrir }: LinhaDaFaturaProps) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={ativa ? 'true' : undefined}
      style={{
        textAlign: 'left',
        ...fundoComVidro(ativa ? 'var(--color-royal-soft)' : 'var(--bg-card)'),
        border: `1px solid ${ativa ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--leaf-sm)',
        padding: '11px 13px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {competenciaPorExtenso(fatura.competencia)}
        </span>
        <StatusBadge tone={TOM[fatura.status]}>{ROTULO[fatura.status]}</StatusBadge>
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <AmountDisplay value={totalDaFatura(fatura) / 100} size="sm" />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(fatura.compras.length, 'compra')}
        </span>
      </span>
    </button>
  );
}
