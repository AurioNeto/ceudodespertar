import { formatarValor } from '@/lib/formato';
import { pluralizar } from '@/pages/utils/formato';
import type { LinhaDoRelatorio } from '../../mocks/relatorios';
import type { ValoresAConferir } from '../../tipos';

export interface SituacaoDoRecorteProps {
  aConferir: readonly LinhaDoRelatorio[];
  valoresAConferir: ValoresAConferir;
}

const valoresPorTipo = ({ entradas, saidas, transferencias }: ValoresAConferir) =>
  [
    `entradas ${formatarValor(entradas)}`,
    `saídas ${formatarValor(saidas)}`,
    ...(transferencias > 0 ? [`transferências ${formatarValor(transferencias)}`] : []),
  ].join(' · ');

export function SituacaoDoRecorte({ aConferir, valoresAConferir }: SituacaoDoRecorteProps) {
  return (
    <div
      style={{
        font: 'var(--text-small)',
        color: aConferir.length ? 'var(--color-pending)' : 'var(--text-secondary)',
        background: aConferir.length ? 'var(--color-pending-soft)' : 'transparent',
        border: aConferir.length ? '1px solid var(--color-pending-border)' : 0,
        borderRadius: 'var(--radius)',
        padding: aConferir.length ? '9px 13px' : 0,
      }}
    >
      {aConferir.length === 0
        ? 'Todos os lançamentos deste recorte estão consolidados.'
        : `Inclui ${pluralizar(aConferir.length, 'lançamento a conferir', 'lançamentos a conferir')} (${valoresPorTipo(valoresAConferir)}) — os números podem mudar depois da conferência.`}
    </div>
  );
}
