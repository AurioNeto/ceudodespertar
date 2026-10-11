import { formatarValor } from '@/lib/formato';
import { pluralizar } from '@/pages/utils/formato';
import type { LinhaDoRelatorio } from '../../mocks/relatorios';

export interface SituacaoDoRecorteProps {
  aConferir: readonly LinhaDoRelatorio[];
  valorAConferir: number;
}

export function SituacaoDoRecorte({ aConferir, valorAConferir }: SituacaoDoRecorteProps) {
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
        : `Inclui ${pluralizar(aConferir.length, 'lançamento a conferir', 'lançamentos a conferir')} (${formatarValor(valorAConferir)}) — os números podem mudar depois da conferência.`}
    </div>
  );
}
