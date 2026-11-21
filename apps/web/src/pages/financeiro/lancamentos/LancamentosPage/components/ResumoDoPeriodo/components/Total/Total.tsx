import { AmountDisplay, Rotulo } from '@/ds';

export interface TotalProps {
  rotulo: string;
  valor: number;
  cor: string;
}

export function Total({ rotulo, valor, cor }: TotalProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Rotulo>{rotulo}</Rotulo>
      <AmountDisplay value={valor} size="sm" style={{ color: cor, letterSpacing: 'var(--tracking-amount)' }} />
    </div>
  );
}
