export interface SeletorDeTipoProps<T extends string> {
  opcoes: readonly { valor: T; label: string }[];
  valor: T;
  onEscolher: (valor: T) => void;
  densidade?: 'office' | 'field';
}

export function SeletorDeTipo<T extends string>({
  opcoes,
  valor,
  onEscolher,
  densidade = 'office',
}: SeletorDeTipoProps<T>) {
  const campo = densidade === 'field';
  return (
    <div style={{ display: 'flex', gap: campo ? 6 : 8, flexWrap: campo ? 'nowrap' : 'wrap' }}>
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={on}
            onClick={() => onEscolher(o.valor)}
            style={{
              font: campo ? 'var(--text-small)' : on ? 'var(--text-body-strong)' : 'var(--text-body)',
              fontWeight: on ? 600 : undefined,
              padding: campo ? '10px 6px' : '9px 14px',
              minHeight: campo ? 'var(--target-field)' : 40,
              flex: campo ? 1 : undefined,
              textAlign: 'center',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
              background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
              color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
