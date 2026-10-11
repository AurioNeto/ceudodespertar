import { Icon, type IconName } from '@/ds';

export function ItemDeMeta({
  icone,
  cor = 'var(--text-meta)',
  children,
}: {
  icone: IconName;
  cor?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--text-small)',
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name={icone} size={14} color={cor} />
      {children}
    </span>
  );
}
