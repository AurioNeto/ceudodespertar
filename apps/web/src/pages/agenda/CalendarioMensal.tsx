import { CORES_POR_TIPO, type Trabalho } from '../../mocks/agenda';
import { hoje } from '../../mocks/sessao';

const DIAS_DA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export interface CalendarioMensalProps {
  ano: number;
  mes: number;
  trabalhos: readonly Trabalho[];
  onAbrir: (id: number) => void;
}

export function CalendarioMensal({ ano, mes, trabalhos, onAbrir }: CalendarioMensalProps) {
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDia }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

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

export function LegendaDeTipos() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {(Object.keys(CORES_POR_TIPO) as (keyof typeof CORES_POR_TIPO)[]).map((tipo) => (
        <span
          key={tipo}
          style={{ display: 'flex', alignItems: 'center', gap: 7, font: 'var(--text-small)', color: 'var(--text-secondary)' }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 2, background: CORES_POR_TIPO[tipo] }} />
          {tipo}
        </span>
      ))}
    </div>
  );
}
