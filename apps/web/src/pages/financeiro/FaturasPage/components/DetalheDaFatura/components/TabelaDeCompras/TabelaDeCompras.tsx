import type { Fatura } from '@cdd/contracts';
import { EmptyState, StatusBadge, Td, Th, type Density } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';

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

  return (
    <div
      style={{
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 460 : undefined }}>
        <thead>
          <tr style={{ background: 'var(--bg-sunken)' }}>
            <Th>Data</Th>
            <Th>Compra</Th>
            {campo ? null : <Th>Grupo</Th>}
            {campo ? null : <Th>Quem registrou</Th>}
            <Th alinharDireita>Valor</Th>
          </tr>
        </thead>
        <tbody>
          {fatura.compras.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid var(--color-line)' }}>
              <Td>
                <span data-numeric style={{ color: 'var(--text-secondary)' }}>
                  {formatarData(c.data).slice(0, 5)}
                </span>
              </Td>
              <Td>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{c.motivo}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-meta)' }}>{c.categoria}</span>
                    {c.status === 'A_CONFERIR' ? <StatusBadge tone="pending">A conferir</StatusBadge> : null}
                  </span>
                </span>
              </Td>
              {campo ? null : <Td>{c.grupo ?? '—'}</Td>}
              {campo ? null : <Td>{c.registradoPorNome}</Td>}
              <Td alinharDireita>
                <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
                  {formatarDinheiro(c.valor)}
                </span>
              </Td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--color-line-strong)', background: 'var(--bg-sunken)' }}>
            <Td>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Total</span>
            </Td>
            <Td />
            {campo ? null : <Td />}
            {campo ? null : <Td />}
            <Td alinharDireita>
              <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
                {formatarDinheiro(total)}
              </span>
            </Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
