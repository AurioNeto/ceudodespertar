import { BotaoDeIcone, type Density } from '@/ds';

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
  border: '1px solid var(--color-line)',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  borderRadius: 'var(--radius-pill)',
} as const;

const estadoDoBotao = (desligado: boolean) =>
  ({ opacity: desligado ? 0.5 : 1, cursor: desligado ? 'not-allowed' : 'pointer' }) as const;

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
      {campo ? (
        <BotaoDeIcone
          icone="arrow-left"
          aria-label="Página anterior"
          onClick={onAnterior}
          disabled={noInicio}
          medida={44}
          style={{ ...botaoCampo, ...estadoDoBotao(noInicio) }}
        />
      ) : (
        <button
          type="button"
          onClick={onAnterior}
          disabled={noInicio}
          aria-label="Página anterior"
          style={{ ...botao, ...estadoDoBotao(noInicio) }}
        >
          ‹ Anterior
        </button>
      )}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{texto}</span>
      {campo ? (
        <BotaoDeIcone
          icone="arrow-right"
          aria-label="Próxima página"
          onClick={onProxima}
          disabled={noFim}
          medida={44}
          style={{ ...botaoCampo, ...estadoDoBotao(noFim) }}
        />
      ) : (
        <button
          type="button"
          onClick={onProxima}
          disabled={noFim}
          aria-label="Próxima página"
          style={{ ...botao, ...estadoDoBotao(noFim) }}
        >
          Próxima ›
        </button>
      )}
    </div>
  );
}
