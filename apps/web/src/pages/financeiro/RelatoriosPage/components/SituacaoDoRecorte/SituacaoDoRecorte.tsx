import { reais } from '@cdd/contracts';
import { Aviso } from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import type { LinhaDoRelatorio } from '../../mocks/relatorios';
import type { ValoresAConferir } from '../../tipos';

export interface SituacaoDoRecorteProps {
  aConferir: readonly LinhaDoRelatorio[];
  valoresAConferir: ValoresAConferir;
}

const valoresPorTipo = ({ entradas, saidas, transferencias }: ValoresAConferir) =>
  [
    `entradas ${formatarBRL(reais(entradas))}`,
    `saídas ${formatarBRL(reais(saidas))}`,
    ...(transferencias > 0 ? [`transferências ${formatarBRL(reais(transferencias))}`] : []),
  ].join(' · ');

export function SituacaoDoRecorte({ aConferir, valoresAConferir }: SituacaoDoRecorteProps) {
  if (aConferir.length === 0) {
    return (
      <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Todos os lançamentos deste recorte estão consolidados.
      </div>
    );
  }
  return (
    <Aviso tom="pendente">
      {`Inclui ${pluralizar(aConferir.length, 'lançamento a conferir', 'lançamentos a conferir')} (${valoresPorTipo(valoresAConferir)}) — os números podem mudar depois da conferência.`}
    </Aviso>
  );
}
