import type { ReactNode } from 'react';
import type { Emprestimo } from '@cdd/contracts';
import { AmountDisplay, DataTable, EmptyState, Rotulo, type Density } from '@/ds';
import { formatarData, pluralizar } from '@/pages/utils/formato';
import { COLUNAS_DAS_DEVOLUCOES, COLUNAS_SO_DO_ESCRITORIO } from './constantes';

type LinhaDaDevolucao = Record<(typeof COLUNAS_DAS_DEVOLUCOES)[number]['key'], ReactNode>;

export interface TabelaDeDevolucoesProps {
  emprestimo: Emprestimo;
  densidade: Density;
}

export function TabelaDeDevolucoes({ emprestimo, densidade }: TabelaDeDevolucoesProps) {
  const campo = densidade === 'field';
  const colunas = campo
    ? COLUNAS_DAS_DEVOLUCOES.filter((coluna) => !COLUNAS_SO_DO_ESCRITORIO.has(coluna.key))
    : COLUNAS_DAS_DEVOLUCOES;
  const devolucoes: LinhaDaDevolucao[] = emprestimo.devolucoes.map((dv) => ({
    data: <span data-numeric>{formatarData(dv.data)}</span>,
    conta: dv.contaNome,
    quem: dv.registradoPorNome,
    valor: <AmountDisplay value={dv.valor / 100} size="sm" style={{ color: 'var(--color-confirmed)' }} />,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <Rotulo>Devoluções</Rotulo>
      {emprestimo.devolucoes.length === 0 ? (
        <EmptyState
          title="Nenhuma devolução ainda"
          description="Cada devolução entra aqui com a transferência que a acompanha."
        />
      ) : (
        <DataTable columns={colunas} rows={devolucoes} />
      )}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {pluralizar(emprestimo.devolucoes.length, 'devolução', 'devoluções')} · a soma nunca passa do principal.
      </span>
    </div>
  );
}
