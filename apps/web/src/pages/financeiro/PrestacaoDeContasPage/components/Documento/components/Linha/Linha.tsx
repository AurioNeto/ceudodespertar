import { AmountDisplay } from '@/ds';
import type { LinhaDePrestacao, NivelDeDetalhe } from '../../../../mocks/prestacao';

export function Linha({ linha, nivel }: { linha: LinhaDePrestacao; nivel: NivelDeDetalhe }) {
  const mostrarNome = nivel === 'DETALHADO' && linha.nominal;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{linha.rotulo}</span>
        {mostrarNome ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-pending)' }}>{linha.nominal}</span>
        ) : null}
      </span>
      <AmountDisplay value={linha.valor / 100} size="sm" />
    </div>
  );
}
