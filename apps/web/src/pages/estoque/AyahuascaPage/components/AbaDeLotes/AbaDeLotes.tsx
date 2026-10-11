import { StatusBadge, type Density } from '@/ds';
import { SITUACAO } from '../../constantes';
import type { LoteDeDaime } from '../../mocks/ayahuasca';
import { litros } from '../../utils/litros';

export interface AbaDeLotesProps {
  lotes: readonly LoteDeDaime[];
  densidade: Density;
  onAbrir: (id: number) => void;
}

export function AbaDeLotes({ lotes, densidade, onAbrir }: AbaDeLotesProps) {
  const campo = densidade === 'field';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
        gap: 12,
      }}
    >
      {lotes.map((l) => {
        const info = SITUACAO[l.situacao];
        const cor =
          l.situacao === 'quarentena'
            ? 'var(--color-pending)'
            : l.restante === 0
              ? 'var(--color-line-strong)'
              : 'var(--color-royal)';
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onAbrir(l.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
              padding: '14px 16px',
              border: 'var(--border-hairline)',
              borderLeft: `3px solid ${cor}`,
              borderRadius: 'var(--radius)',
              background: 'var(--bg-card)',
              cursor: 'pointer',
              height: '100%',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', flex: 1 }}>
                {l.codigo}
              </span>
              <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
            </div>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {l.origem} · {l.data}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  font: 'var(--text-amount-lg)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-royal-deep)',
                }}
              >
                {litros(l.restante)}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                de {litros(l.litros)}
              </span>
            </div>
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
                  background: cor,
                  width: `${l.litros ? Math.max(0, (l.restante / l.litros) * 100) : 0}%`,
                  transition: 'width 420ms cubic-bezier(.22,.61,.36,1)',
                }}
              />
            </span>
            <span
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                font: 'var(--text-small)',
                color: 'var(--text-meta)',
              }}
            >
              <span>
                {l.forca} · {l.local}
              </span>
              <span>{l.guardiao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
