import type { Emprestimo } from '@cdd/contracts';
import { EmptyState, Rotulo, Td, Th, type Density } from '@/ds';
import { formatarData, formatarDinheiro, pluralizar } from '@/pages/utils/formato';

export interface TabelaDeDevolucoesProps {
  emprestimo: Emprestimo;
  densidade: Density;
}

export function TabelaDeDevolucoes({ emprestimo, densidade }: TabelaDeDevolucoesProps) {
  const campo = densidade === 'field';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <Rotulo>Devoluções</Rotulo>
      {emprestimo.devolucoes.length === 0 ? (
        <EmptyState
          title="Nenhuma devolução ainda"
          description="Cada devolução entra aqui com a transferência que a acompanha."
        />
      ) : (
        <div
          style={{
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
            overflowX: 'auto',
          }}
        >
          <table
            style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 420 : undefined }}
          >
            <thead>
              <tr style={{ background: 'var(--bg-sunken)' }}>
                <Th>Data</Th>
                <Th>Conta</Th>
                {campo ? null : <Th>Quem registrou</Th>}
                <Th alinharDireita>Valor</Th>
              </tr>
            </thead>
            <tbody>
              {emprestimo.devolucoes.map((dv) => (
                <tr key={dv.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                  <Td>
                    <span data-numeric>{formatarData(dv.data)}</span>
                  </Td>
                  <Td>{dv.contaNome}</Td>
                  {campo ? null : <Td>{dv.registradoPorNome}</Td>}
                  <Td alinharDireita>
                    <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-confirmed)' }}>
                      {formatarDinheiro(dv.valor)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        {pluralizar(emprestimo.devolucoes.length, 'devolução', 'devoluções')} · a soma nunca passa do principal.
      </span>
    </div>
  );
}
