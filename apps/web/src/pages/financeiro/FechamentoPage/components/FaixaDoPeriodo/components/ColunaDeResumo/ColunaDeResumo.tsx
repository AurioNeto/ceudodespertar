import { AmountDisplay, Rotulo } from '@/ds';

export function ColunaDeResumo({
  rotulo,
  valor,
  cor,
  divisor = false,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  divisor?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0,
        paddingLeft: divisor ? 20 : undefined,
        borderLeft: divisor ? '1px solid var(--border-brand)' : undefined,
      }}
    >
      <Rotulo>{rotulo}</Rotulo>
      <AmountDisplay value={valor / 100} size="lg" style={{ color: cor }} />
    </div>
  );
}
