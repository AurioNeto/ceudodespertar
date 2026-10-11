export interface LadoProps {
  rotulo: string;
  texto: string;
  data: string;
  valor: string;
}

export function Lado({ rotulo, texto, data, valor }: LadoProps) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', width: 74, flex: '0 0 auto' }}>{rotulo}</span>
      <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>{texto}</span>
      <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {data.slice(0, 5)}
      </span>
      <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
        {valor}
      </span>
    </div>
  );
}
