export interface SetaRedondaProps {
  rotulo: string;
  onClick: () => void;
}

export function SetaRedonda({ rotulo, onClick }: SetaRedondaProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        flex: '0 0 auto',
        border: '1px solid var(--color-line-strong)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        font: 'var(--text-body-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {rotulo === 'anterior' ? '‹' : '›'}
    </button>
  );
}
