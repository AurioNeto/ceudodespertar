import { reais } from '@cdd/contracts';
import { formatarBRL } from '@/pages/utils/formato';

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
      {formatarBRL(reais(valor))}
    </span>
  );
}
