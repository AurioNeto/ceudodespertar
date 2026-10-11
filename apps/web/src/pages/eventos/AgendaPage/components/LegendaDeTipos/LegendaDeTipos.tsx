import { CORES_POR_TIPO } from '../../constantes';

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
