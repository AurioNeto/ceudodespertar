import { AmountDisplay, Rotulo, type Density } from '@/ds';
import type { Comparacao } from '../../tipos';
import { corDoDelta, textoDoDelta } from '../../utils/delta';
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
            borderRadius: 'var(--leaf-lg)',
            padding: campo ? '11px 12px' : '13px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <Rotulo>{k.label}</Rotulo>
          <AmountDisplay value={k.valor} size={campo ? 'sm' : 'lg'} style={{ color: k.cor }} />
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
