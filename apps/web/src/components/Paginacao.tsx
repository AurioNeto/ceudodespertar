import type { Density } from '../ds';

export interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  texto: string;
  onAnterior: () => void;
  onProxima: () => void;
  densidade?: Density;
}

const botao = {
  font: 'var(--text-body)',
  padding: '8px 16px',
  minHeight: 38,
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  border: '1px solid var(--color-line)',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
} as const;

const botaoCampo = {
  ...botao,
  font: 'var(--text-body-strong)',
  width: 44,
  height: 44,
  padding: 0,
  borderRadius: 'var(--radius-pill)',
} as const;

export function Paginacao({
  pagina,
  totalPaginas,
  texto,
  onAnterior,
  onProxima,
  densidade = 'office',
}: PaginacaoProps) {
  const campo = densidade === 'field';
  const noInicio = pagina === 0;
  const noFim = pagina >= totalPaginas - 1;
  const estilo = campo ? botaoCampo : botao;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: campo ? 'space-between' : 'center',
        gap: campo ? 8 : 10,
        paddingTop: 4,
      }}
    >
      <button
        type="button"
        onClick={onAnterior}
        disabled={noInicio}
        aria-label="Página anterior"
        style={{ ...estilo, opacity: noInicio ? 0.5 : 1, cursor: noInicio ? 'not-allowed' : 'pointer' }}
      >
        {campo ? '‹' : '‹ Anterior'}
      </button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{texto}</span>
      <button
        type="button"
        onClick={onProxima}
        disabled={noFim}
        aria-label="Próxima página"
        style={{ ...estilo, opacity: noFim ? 0.5 : 1, cursor: noFim ? 'not-allowed' : 'pointer' }}
      >
        {campo ? '›' : 'Próxima ›'}
      </button>
    </div>
  );
}
