import { StatusBadge } from '@/ds';
import { CORES_POR_TIPO } from '../../constantes';
import type { Trabalho } from '../../tipos';
import { TOM_DA_SITUACAO } from './constantes';
import { rotuloDaSituacao } from './utils/rotuloDaSituacao';

export interface ListaDeTrabalhosProps {
  trabalhos: readonly Trabalho[];
  onAbrir: (id: number) => void;
}

export function ListaDeTrabalhos({ trabalhos, onAbrir }: ListaDeTrabalhosProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {trabalhos.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onAbrir(t.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 14px',
            border: 'var(--border-hairline)',
            borderLeft: `3px solid ${CORES_POR_TIPO[t.tipo]}`,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span
            style={{
              font: 'var(--text-code)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-meta)',
              flex: '0 0 auto',
            }}
          >
            {String(t.dia).padStart(2, '0')}/{String(t.mes).padStart(2, '0')}
          </span>
          <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                font: 'var(--text-body-strong)',
                color: 'var(--text-primary)',
                textDecoration: t.situacao === 'cancelada' ? 'line-through' : 'none',
              }}
            >
              {t.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {t.horario} · {t.local} · {t.dirigente}
            </span>
          </span>
          {t.litros > 0 ? (
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{t.litros} L</span>
          ) : null}
          <StatusBadge tone={TOM_DA_SITUACAO[t.situacao]}>{rotuloDaSituacao(t.situacao)}</StatusBadge>
        </button>
      ))}
    </div>
  );
}
