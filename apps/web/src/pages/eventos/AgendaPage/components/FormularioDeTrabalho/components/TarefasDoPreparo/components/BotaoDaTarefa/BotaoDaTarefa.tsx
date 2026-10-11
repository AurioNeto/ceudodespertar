export function BotaoDaTarefa({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        flex: '0 0 auto',
        border: '1px solid var(--color-line)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
