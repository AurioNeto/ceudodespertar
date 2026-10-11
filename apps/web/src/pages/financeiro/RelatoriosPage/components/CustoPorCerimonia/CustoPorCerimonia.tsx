import { formatarValor } from '@/lib/formato';
import type { useRelatorio } from '../../hooks/useRelatorio';
import type { Drill } from '../../tipos';
import { Cartao } from '../Cartao';

export interface CustoPorCerimoniaProps {
  porCerimonia: ReturnType<typeof useRelatorio>['porCerimonia'];
  onAbrirDrill: (d: Drill) => void;
}

export function CustoPorCerimonia({ porCerimonia, onAbrirDrill }: CustoPorCerimoniaProps) {
  return (
    <Cartao titulo="Custo por cerimônia">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {porCerimonia.map((c) => (
          <button
            key={c.nome}
            type="button"
            onClick={() =>
              onAbrirDrill({ rotulo: 'Gastos da cerimônia', campo: 'cerimonia', valor: c.nome, tipo: 'saida' })
            }
            style={{ display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%' }}>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{c.nome}</span>
              <span
                style={{
                  font: 'var(--text-small)',
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatarValor(c.valor)}
              </span>
            </span>
            <span
              style={{
                width: '100%',
                height: 8,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-sunken)',
                overflow: 'hidden',
                display: 'block',
              }}
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-pending)',
                  width: `${(c.valor / Math.max(1, ...porCerimonia.map((x) => x.valor))) * 100}%`,
                  transition: 'width 520ms cubic-bezier(.22,.61,.36,1)',
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </Cartao>
  );
}
