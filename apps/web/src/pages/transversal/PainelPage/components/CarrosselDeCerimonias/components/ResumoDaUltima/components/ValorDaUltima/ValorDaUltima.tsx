import { formatarDinheiro } from '@/pages/utils/formato';
import { numeroGrande, rotuloLabel } from '../../../../../../constantes';

export function ValorDaUltima({
  rotulo,
  valor,
  cor,
  sinal = false,
  divisor = false,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  sinal?: boolean;
  divisor?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingLeft: divisor ? 18 : undefined,
        borderLeft: divisor ? 'var(--border-hairline)' : undefined,
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...numeroGrande, color: cor }}>
        {sinal ? '+ ' : ''}
        {formatarDinheiro(valor)}
      </span>
    </div>
  );
}
