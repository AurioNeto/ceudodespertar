import type { ItemNaFila } from '@cdd/contracts';
import type { Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { FILTROS } from '../../constantes';
import type { FiltroOrigem } from '../../constantes';

export interface FiltrosDeOrigemProps {
  itens: readonly ItemNaFila[];
  filtro: FiltroOrigem;
  totalVisiveis: number;
  densidade: Density;
  onEscolher: (filtro: FiltroOrigem) => void;
}

export function FiltrosDeOrigem({ itens, filtro, totalVisiveis, densidade, onEscolher }: FiltrosDeOrigemProps) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {FILTROS.map((f) => {
        const on = filtro === f.valor;
        const quantos = f.valor === 'TODAS' ? itens.length : itens.filter((i) => i.origem === f.valor).length;
        return (
          <button
            key={f.valor}
            type="button"
            aria-pressed={on}
            onClick={() => onEscolher(f.valor)}
            style={{
              font: 'var(--text-small)',
              padding: '8px 14px',
              minHeight: 38,
              borderRadius: 'var(--radius-pill)',
              cursor: 'pointer',
              border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
              background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
              color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
            }}
          >
            {f.label} ({quantos})
          </button>
        );
      })}
      {campo ? null : (
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {pluralizar(totalVisiveis, 'item na fila', 'itens na fila')}
        </span>
      )}
    </div>
  );
}
