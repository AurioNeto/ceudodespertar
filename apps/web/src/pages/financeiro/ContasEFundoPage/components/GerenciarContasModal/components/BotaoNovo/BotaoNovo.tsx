export interface BotaoNovoProps {
  rotulo: string;
  onClick: () => void;
}

export function BotaoNovo({ rotulo, onClick }: BotaoNovoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignSelf: 'flex-start',
        font: 'var(--text-small)',
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        border: '1px dashed var(--color-line-strong)',
        background: 'var(--bg-card)',
        color: 'var(--color-royal-deep)',
      }}
    >
      {rotulo}
    </button>
  );
}
