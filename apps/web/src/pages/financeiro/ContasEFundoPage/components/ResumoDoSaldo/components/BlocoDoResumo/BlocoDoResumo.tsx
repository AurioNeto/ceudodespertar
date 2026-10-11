import { Rotulo } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { valorGrande } from '../../../../constantes';

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
      <span style={{ ...valorGrande, color: 'var(--text-primary)' }}>{formatarBRL(valor)}</span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}
