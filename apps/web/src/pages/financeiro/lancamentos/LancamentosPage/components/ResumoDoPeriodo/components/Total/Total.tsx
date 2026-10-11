import { Rotulo } from '@/ds';
import { valorTabular } from '../../../../constantes';

export interface TotalProps {
  rotulo: string;
  valor: string;
  cor: string;
}

export function Total({ rotulo, valor, cor }: TotalProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ ...valorTabular, color: cor }}>{valor}</span>
    </div>
  );
}
