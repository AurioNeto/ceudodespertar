import { rotuloLabel, valorTabular } from '../../../../constantes';

export interface TotalProps {
  rotulo: string;
  valor: string;
  cor: string;
}

export function Total({ rotulo, valor, cor }: TotalProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorTabular, color: cor }}>{valor}</span>
    </div>
  );
}
