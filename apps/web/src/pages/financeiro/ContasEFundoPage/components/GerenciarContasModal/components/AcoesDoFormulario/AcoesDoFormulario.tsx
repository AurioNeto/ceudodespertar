export interface AcoesDoFormularioProps {
  rotuloSalvar: string;
  onCancelar: () => void;
  onSalvar: () => void;
}

export function AcoesDoFormulario({ rotuloSalvar, onCancelar, onSalvar }: AcoesDoFormularioProps) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
      <button
        type="button"
        onClick={onCancelar}
        style={{
          font: 'var(--text-body)',
          padding: '9px 16px',
          minHeight: 40,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: '1px solid var(--color-line)',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
        }}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSalvar}
        style={{
          font: 'var(--text-body-strong)',
          padding: '9px 18px',
          minHeight: 40,
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          border: '1px solid var(--color-royal-border)',
          background: 'var(--color-royal-soft)',
          color: 'var(--color-royal-deep)',
        }}
      >
        {rotuloSalvar}
      </button>
    </div>
  );
}
