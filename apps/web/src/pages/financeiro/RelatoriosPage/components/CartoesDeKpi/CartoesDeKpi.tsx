import type { Density } from '@/ds';
import { formatarValor } from '@/lib/formato';
import { rotuloLabel } from '../../constantes';
import { corDoDelta, textoDoDelta, type Comparacao } from '../../hooks/useRelatorio';
import type { kpisDoRelatorio } from '../../utils/recorte';

export interface CartoesDeKpiProps {
  kpis: ReturnType<typeof kpisDoRelatorio>;
  comparar: Comparacao;
  densidade: Density;
}

export function CartoesDeKpi({ kpis, comparar, densidade }: CartoesDeKpiProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(190px,1fr))',
        gap: 12,
      }}
    >
      {kpis.map((k) => (
        <div
          key={k.label}
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: campo ? '11px 12px' : '13px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={rotuloLabel}>{k.label}</span>
          <span
            style={{
              font: campo ? 'var(--text-amount)' : 'var(--text-amount-lg)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: k.cor,
            }}
          >
            {formatarValor(k.valor)}
          </span>
          <span
            style={{
              font: 'var(--text-small)',
              color: k.nota ? 'var(--text-meta)' : corDoDelta(k.valor, k.base, k.bomSeSobe, comparar),
            }}
          >
            {k.nota ?? textoDoDelta(k.valor, k.base, comparar)}
          </span>
        </div>
      ))}
    </div>
  );
}
