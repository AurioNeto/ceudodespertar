import type { CategoriaId } from '@cdd/contracts';
import { Button, StatusBadge, Select, Rotulo, Td, Th, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { REGIME_ROTULO } from '../../constantes';
import { LINHAS_DE_RELATORIO, type CategoriaDoPlano } from '../../mocks/parametros';

export function TabelaDeCategorias({
  categorias,
  densidade,
  editando,
  linhaEscolhida,
  onLinha,
  onEditar,
  onCancelar,
  onCorrigir,
}: {
  categorias: readonly CategoriaDoPlano[];
  densidade: Density;
  editando: CategoriaId | null;
  linhaEscolhida: string;
  onLinha: (v: string) => void;
  onEditar: (c: CategoriaDoPlano) => void;
  onCancelar: () => void;
  onCorrigir: (c: CategoriaDoPlano) => void;
}) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
      <Rotulo>{pluralizar(categorias.length, 'categoria')} no plano de contas</Rotulo>

      <div
        style={{
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-card)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 620 : 860 }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              <Th>Categoria</Th>
              <Th>Natureza</Th>
              <Th>Tipo</Th>
              <Th>Regimes</Th>
              <Th>Linha de relatório</Th>
              <Th alinharDireita>Lançamentos</Th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => {
              const faltando = c.ativa && !c.linhaRelatorio;
              const emEdicao = editando === c.id;
              return (
                <tr
                  key={c.id}
                  style={{
                    borderTop: '1px solid var(--color-line)',
                    background: faltando ? 'var(--color-attention-soft)' : undefined,
                    opacity: c.ativa ? 1 : 0.58,
                  }}
                >
                  <Td>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{c.nome}</span>
                        {c.ativa ? null : <StatusBadge tone="neutral">Inativa</StatusBadge>}
                      </span>
                      <code style={{ font: 'var(--text-code)' }}>{c.codigoSistema}</code>
                      {c.nota ? (
                        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '52ch' }}>{c.nota}</span>
                      ) : null}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        font: 'var(--text-body)',
                        color: c.natureza === 'RECEITA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
                      }}
                    >
                      {c.natureza === 'RECEITA' ? 'Receita' : 'Despesa'}
                    </span>
                  </Td>
                  <Td>{c.tipo.charAt(0) + c.tipo.slice(1).toLowerCase()}</Td>
                  <Td>
                    <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.regimesPermitidos.map((r) => (
                        <span
                          key={r}
                          style={{
                            font: 'var(--text-small)',
                            background: 'var(--bg-sunken)',
                            border: '1px solid var(--color-line)',
                            borderRadius: 'var(--radius-pill)',
                            padding: '2px 9px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {REGIME_ROTULO[r]}
                        </span>
                      ))}
                    </span>
                  </Td>
                  <Td>
                    {emEdicao ? (
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 220 }}>
                        <Select
                          label="Linha de relatório"
                          value={linhaEscolhida}
                          options={LINHAS_DE_RELATORIO.map((l) => ({ value: l, label: l }))}
                          onChange={onLinha}
                        />
                        <span style={{ display: 'flex', gap: 7 }}>
                          <Button iconName="check" onClick={() => onCorrigir(c)}>
                            Salvar
                          </Button>
                          <Button variant="quiet" onClick={onCancelar}>
                            Cancelar
                          </Button>
                        </span>
                      </span>
                    ) : c.linhaRelatorio ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text-primary)' }}>{c.linhaRelatorio}</span>
                        {c.ativa ? (
                          <button
                            type="button"
                            onClick={() => onEditar(c)}
                            aria-label={`trocar a linha de ${c.nome}`}
                            style={{ color: 'var(--text-link)', cursor: 'pointer', font: 'var(--text-small)' }}
                          >
                            trocar
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <StatusBadge tone="attention">Faltando</StatusBadge>
                        <Button variant="ghost" iconName="pencil" onClick={() => onEditar(c)}>
                          Escolher linha
                        </Button>
                      </span>
                    )}
                  </Td>
                  <Td alinharDireita>
                    <span data-numeric style={{ color: 'var(--text-secondary)' }}>
                      {c.lancamentos}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          <b>Natureza não muda</b> depois de criada: uma categoria não troca de lado. Se precisa dos dois, são duas
          categorias — é por isso que cachê pago e cachê recebido existem separados.
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Categoria com lançamento confirmado <b>não se exclui</b>, só se inativa.
        </span>
      </div>
    </div>
  );
}
