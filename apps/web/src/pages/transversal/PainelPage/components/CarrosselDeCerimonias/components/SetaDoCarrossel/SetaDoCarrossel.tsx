import { Icon, type IconName } from '@/ds';

export function SetaDoCarrossel({
  rotulo,
  icone,
  onClick,
}: {
  rotulo: string;
  icone: IconName;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--color-royal)',
      }}
    >
      <Icon name={icone} size={18} color="var(--color-royal)" />
    </button>
  );
}
