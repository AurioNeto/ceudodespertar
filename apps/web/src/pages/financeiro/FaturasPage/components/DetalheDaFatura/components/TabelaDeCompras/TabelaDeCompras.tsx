import type { ReactNode } from 'react';
import type { Fatura } from '@cdd/contracts';
import { DataTable, EmptyState, StatusBadge, type Density } from '@/ds';
import { formatarBRL, formatarData } from '@/pages/utils/formato';
import { COLUNAS_DAS_COMPRAS, COLUNAS_SO_DO_ESCRITORIO } from './constantes';

type LinhaDaCompra = Record<(typeof COLUNAS_DAS_COMPRAS)[number]['key'], ReactNode>;

export interface TabelaDeComprasProps {
  fatura: Fatura;
  densidade: Density;
  total: number;
}

export function TabelaDeCompras({ fatura, densidade, total }: TabelaDeComprasProps) {
  const campo = densidade === 'field';

  if (fatura.compras.length === 0) {
    return (
      <EmptyState
        title="Nenhuma compra ainda"
        description="As compras aparecem aqui conforme forem registradas neste cartão."
      />
    );
  }

  const colunas = campo
    ? COLUNAS_DAS_COMPRAS.filter((coluna) => !COLUNAS_SO_DO_ESCRITORIO.has(coluna.key))
    : COLUNAS_DAS_COMPRAS;

  const compras: LinhaDaCompra[] = fatura.compras.map((c) => ({
    data: (
      <span data-numeric style={{ color: 'var(--text-secondary)' }}>
        {formatarData(c.data).slice(0, 5)}
      </span>
    ),
    compra: (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ color: 'var(--text-primary)' }}>{c.motivo}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-meta)' }}>{c.categoria}</span>
          {c.status === 'A_CONFERIR' ? <StatusBadge tone="pending">A conferir</StatusBadge> : null}
        </span>
      </span>
    ),
    grupo: c.grupo ?? '—',
    quem: c.registradoPorNome,
    valor: formatarBRL(c.valor),
  }));

  const linhaDoTotal: LinhaDaCompra = {
    data: <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Total</span>,
    compra: null,
    grupo: null,
    quem: null,
    valor: formatarBRL(total),
  };

  return <DataTable columns={colunas} rows={[...compras, linhaDoTotal]} />;
}
