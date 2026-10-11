import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel, valorGrande } from '../../../../constantes';

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
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorGrande, color: 'var(--text-primary)' }}>{formatarDinheiro(valor)}</span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}
