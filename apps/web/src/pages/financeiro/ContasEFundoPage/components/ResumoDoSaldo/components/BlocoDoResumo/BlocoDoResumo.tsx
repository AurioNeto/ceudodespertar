import { AmountDisplay, Rotulo } from '@/ds';

export interface BlocoDoResumoProps {
  rotulo: string;
  valor: number;
  nota: string;
}

export function BlocoDoResumo({ rotulo, valor, nota }: BlocoDoResumoProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        paddingLeft: 20,
        borderLeft: '1px solid var(--border-brand)',
      }}
    >
      <Rotulo>{rotulo}</Rotulo>
      <AmountDisplay value={valor / 100} size="lg" />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}
