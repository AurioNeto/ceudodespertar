import { formatarBRL } from '@/pages/utils/formato';
import { Rotulo } from '@/ds';
import { valorGrande } from '../../../../constantes';

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
      <span style={{ ...valorGrande, color: cor }}>{formatarBRL(valor)}</span>
    </div>
  );
}
