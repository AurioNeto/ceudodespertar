import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel, valorMedio } from '../../../../constantes';

export interface ColunaDoFundoProps {
  rotulo: string;
  valor: number;
  cor: string;
}

export function ColunaDoFundo({ rotulo, valor, cor }: ColunaDoFundoProps) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 20, borderLeft: 'var(--border-hairline)' }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorMedio, color: cor }}>{formatarDinheiro(valor)}</span>
    </div>
  );
}
