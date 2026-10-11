import { rotuloLabel } from '../../../../constantes';

export interface DadoProps {
  rotulo: string;
  valor: string;
}

export function Dado({ rotulo, valor }: DadoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  );
}
