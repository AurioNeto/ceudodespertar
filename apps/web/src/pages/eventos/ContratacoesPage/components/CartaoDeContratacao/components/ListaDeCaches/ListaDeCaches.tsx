import { AmountDisplay, Icon } from '@/ds';
import type { CacheDeMusico } from '../../../../mocks/contratacoes';

export interface ListaDeCachesProps {
  caches: readonly CacheDeMusico[];
}

export function ListaDeCaches({ caches }: ListaDeCachesProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 2 }}>
      {caches.map((m) => (
        <div key={m.nome} style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Icon
            name={m.pago ? 'circle-check' : 'circle-alert'}
            size={13}
            color={m.pago ? 'var(--color-confirmed)' : 'var(--text-meta)'}
          />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)', flex: 1, minWidth: 110 }}>
            {m.nome}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{m.funcao}</span>
          <AmountDisplay
            value={m.valor / 100}
            size="sm"
            style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}
          />
        </div>
      ))}
    </div>
  );
}
