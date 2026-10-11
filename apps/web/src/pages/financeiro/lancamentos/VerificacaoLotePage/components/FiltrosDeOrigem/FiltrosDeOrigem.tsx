import type { ItemNaFila } from '@cdd/contracts';
import type { Density } from '@/ds';
import { ChipDeFiltro } from '@/pages/financeiro/lancamentos/components/ChipDeFiltro';
import { pluralizar } from '@/pages/utils/formato';
import { FILTROS } from '../../constantes';
import type { FiltroOrigem } from '../../constantes';

export interface FiltrosDeOrigemProps {
  itens: readonly ItemNaFila[];
  filtro: FiltroOrigem;
  totalVisiveis: number;
  densidade: Density;
  onEscolher: (filtro: FiltroOrigem) => void;
}

export function FiltrosDeOrigem({ itens, filtro, totalVisiveis, densidade, onEscolher }: FiltrosDeOrigemProps) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {FILTROS.map((f) => {
        const on = filtro === f.valor;
        const quantos = f.valor === 'TODAS' ? itens.length : itens.filter((i) => i.origem === f.valor).length;
        return (
          <ChipDeFiltro key={f.valor} ativo={on} tamanho="compacto" onEscolher={() => onEscolher(f.valor)}>
            {f.label} ({quantos})
          </ChipDeFiltro>
        );
      })}
      {campo ? null : (
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {pluralizar(totalVisiveis, 'item na fila', 'itens na fila')}
        </span>
      )}
    </div>
  );
}
