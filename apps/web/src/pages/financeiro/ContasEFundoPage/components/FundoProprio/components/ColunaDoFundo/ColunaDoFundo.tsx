import { Rotulo } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { valorMedio } from '../../../../constantes';

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
      <Rotulo>{rotulo}</Rotulo>
      <span style={{ ...valorMedio, color: cor }}>{formatarBRL(valor)}</span>
    </div>
  );
}
