import { AmountDisplay, Rotulo } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';

export interface ResultadoDoEventoProps {
  valorAcordado: number;
  totalCaches: number;
  totalCustos: number;
  resultado: number;
}

export function ResultadoDoEvento({ valorAcordado, totalCaches, totalCustos, resultado }: ResultadoDoEventoProps) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        borderRadius: 'var(--leaf-sm)',
        padding: '11px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px 12px',
        alignItems: 'baseline',
      }}
    >
      <Rotulo>Resultado do evento</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 200 }}>
        {formatarBRL(valorAcordado)} − {formatarBRL(totalCaches)} de cachês − {formatarBRL(totalCustos)} de
        custos
      </span>
      <AmountDisplay
        value={resultado / 100}
        size="sm"
        style={{ color: resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)' }}
      />
    </div>
  );
}
