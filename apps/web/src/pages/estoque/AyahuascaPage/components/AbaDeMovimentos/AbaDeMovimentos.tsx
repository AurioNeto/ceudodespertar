import type { Density } from '@/ds';
import { rotuloDoMovimento, valorTabular } from '../../constantes';
import type { LoteDeDaime, MovimentoDeDaime } from '../../mocks/ayahuasca';
import { corDoMovimento } from '../../utils/corDoMovimento';
import { litros } from '../../utils/litros';

export interface AbaDeMovimentosProps {
  movimentos: readonly MovimentoDeDaime[];
  lotes: readonly LoteDeDaime[];
  densidade: Density;
}

export function AbaDeMovimentos({ movimentos, lotes, densidade }: AbaDeMovimentosProps) {
  const campo = densidade === 'field';
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {movimentos.map((m, i) => {
        const lote = lotes.find((l) => l.id === m.loteId);
        return (
          <div
            key={m.id}
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr) auto' : '110px 170px 150px minmax(0,1fr) 110px',
              alignItems: 'center',
              gap: campo ? 8 : 0,
              padding: '11px 13px',
              borderBottom: i === movimentos.length - 1 ? 0 : 'var(--border-hairline)',
              font: 'var(--text-small)',
            }}
          >
            {campo ? (
              <>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{m.destino}</span>
                  <span style={{ color: 'var(--text-meta)' }}>
                    {m.data} · {rotuloDoMovimento[m.tipo]} · {lote?.codigo}
                  </span>
                </span>
                <span style={{ ...valorTabular, color: corDoMovimento(m.tipo) }}>
                  {m.tipo === 'entrada' ? '+ ' : '− '}
                  {litros(m.litros)}
                </span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{m.data}</span>
                <span style={{ color: corDoMovimento(m.tipo) }}>{rotuloDoMovimento[m.tipo]}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{lote?.codigo}</span>
                <span style={{ minWidth: 0, color: 'var(--text-primary)' }}>
                  {m.destino}
                  <span style={{ color: 'var(--text-meta)' }}> · {m.responsavel}</span>
                </span>
                <span style={{ ...valorTabular, textAlign: 'right', color: corDoMovimento(m.tipo) }}>
                  {m.tipo === 'entrada' ? '+ ' : '− '}
                  {litros(m.litros)}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
