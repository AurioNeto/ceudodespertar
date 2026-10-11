import { Icon, type Density } from '@/ds';

export interface OpcaoEmLinhaProps {
  rotulo: string;
  nota?: string;
  valor: string;
  marcada: boolean;
  multipla?: boolean;
  densidade: Density;
  onEscolher: () => void;
}

export function OpcaoEmLinha({
  rotulo,
  nota,
  valor,
  marcada,
  multipla = false,
  densidade,
  onEscolher,
}: OpcaoEmLinhaProps) {
  const campo = densidade === 'field';
  return (
    <button
      type="button"
      aria-pressed={marcada}
      aria-label={rotulo}
      onClick={onEscolher}
      style={{
        textAlign: 'left',
        padding: '11px 14px',
        borderRadius: 'var(--radius)',
        border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
        background: marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        cursor: 'pointer',
        display: 'flex',
        gap: 11,
        alignItems: 'center',
        minHeight: campo ? 'var(--target-field)' : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: multipla ? 5 : '50%',
          border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: marcada ? 'var(--color-royal)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
      </span>
      <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {valor}
      </span>
    </button>
  );
}
