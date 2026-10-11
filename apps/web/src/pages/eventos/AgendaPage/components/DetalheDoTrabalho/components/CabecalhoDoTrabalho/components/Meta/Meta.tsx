import { Icon } from '@/ds';

export function Meta({ icone, children }: { icone: 'calendar-days' | 'landmark' | 'user-round' | 'flask-conical'; children: React.ReactNode }) {
  return (
    <span
      style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--text-small)', color: 'var(--text-secondary)' }}
    >
      <Icon name={icone} size={14} color="var(--text-meta)" />
      {children}
    </span>
  );
}
