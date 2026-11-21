import { AmountDisplay, Rotulo } from '@/ds';

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
      <AmountDisplay value={valor / 100} size="sm" style={{ color: cor }} />
    </div>
  );
}
