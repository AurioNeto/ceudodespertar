import { CORES_POR_TIPO } from '../../constantes';
import type { Trabalho } from '../../tipos';
import { hoje } from '@/pages/mocks/relogio';
import { DIAS_DA_SEMANA } from './constantes';
import { celulasDoMes } from './utils/celulasDoMes';

export interface CalendarioMensalProps {
  ano: number;
  mes: number;
  trabalhos: readonly Trabalho[];
  onAbrir: (id: number) => void;
}

export function CalendarioMensal({ ano, mes, trabalhos, onAbrir }: CalendarioMensalProps) {
  const celulas = celulasDoMes(ano, mes);

  const [anoHoje, mesHoje, diaHoje] = hoje.split('-').map(Number);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', background: 'var(--bg-sunken)' }}>
        {DIAS_DA_SEMANA.map((d) => (
          <span
            key={d}
            style={{
              padding: '9px 10px',
              font: 'var(--text-label)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--text-field-label)',
              borderBottom: '1px solid var(--color-line-strong)',
            }}
          >
            {d}
          </span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))' }}>
        {celulas.map((dia, i) => {
          const doDia = dia ? trabalhos.filter((t) => t.dia === dia && t.mes === mes && t.ano === ano) : [];
          const ehHoje = dia === diaHoje && mes === mesHoje && ano === anoHoje;

          return (
            <div
              key={i}
              style={{
                minHeight: 96,
                padding: '7px 8px',
                borderRight: (i + 1) % 7 === 0 ? 0 : 'var(--border-hairline)',
                borderBottom: 'var(--border-hairline)',
                background: dia ? 'var(--bg-card)' : 'var(--bg-sunken)',
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
              }}
            >
              {dia ? (
                <span
                  style={{
                    font: 'var(--text-code)',
                    fontVariantNumeric: 'tabular-nums',
                    color: ehHoje ? 'var(--color-ink-inverse)' : 'var(--text-meta)',
                    background: ehHoje ? 'var(--color-royal)' : 'transparent',
                    borderRadius: 'var(--radius-pill)',
                    width: 22,
                    height: 22,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {dia}
                </span>
              ) : null}

              {doDia.map((t) => {
                const cancelada = t.situacao === 'cancelada';
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onAbrir(t.id)}
                    title={`${t.nome} · ${t.horario}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      font: '600 11.5px var(--font-body)',
                      color: cancelada ? 'var(--text-meta)' : '#fff',
                      background: cancelada ? 'var(--color-neutral-soft)' : CORES_POR_TIPO[t.tipo],
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 7px',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: cancelada ? 'line-through' : 'none',
                    }}
                  >
                    {t.nome}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
