import { Rotulo } from '@/ds';

export interface DadoProps {
  rotulo: string;
  valor: string;
}

export function Dado({ rotulo, valor }: DadoProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  );
}
