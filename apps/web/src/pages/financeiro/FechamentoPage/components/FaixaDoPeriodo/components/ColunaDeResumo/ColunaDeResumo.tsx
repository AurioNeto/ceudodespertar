import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel, valorGrande } from '../../../../constantes';

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
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorGrande, color: cor }}>{formatarDinheiro(valor)}</span>
    </div>
  );
}
