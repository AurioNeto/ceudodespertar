import { formatarValor } from '@/lib/formato';

export interface NumeroProps {
  valor: number;
  cor: string;
}

export function Numero({ valor, cor }: NumeroProps) {
  return (
    <span
      style={{
        textAlign: 'right',
        font: 'var(--text-amount)',
        letterSpacing: 'var(--tracking-amount)',
        fontVariantNumeric: 'tabular-nums',
        color: cor,
      }}
    >
      {formatarValor(valor)}
    </span>
  );
}
