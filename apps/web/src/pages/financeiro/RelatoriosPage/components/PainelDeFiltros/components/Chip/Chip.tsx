export interface ChipProps {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function Chip({ ativo, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      style={{
        font: 'var(--text-small)',
        padding: '7px 13px',
        minHeight: 36,
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        background: ativo ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        color: ativo ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
