import { AmountDisplay, Rotulo } from '@/ds';
import type { CustoDoEvento } from '../../../../mocks/contratacoes';

export interface OutrosCustosProps {
  custos: readonly CustoDoEvento[];
}

export function OutrosCustos({ custos }: OutrosCustosProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Rotulo>Outros custos do evento</Rotulo>
      {custos.map((x) => (
        <div key={x.descricao} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1 }}>
            {x.descricao}
          </span>
          <AmountDisplay
            value={x.valor / 100}
            size="sm"
            style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}
          />
        </div>
      ))}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Apurados por evento, como em qualquer trabalho da casa.
      </span>
    </div>
  );
}
