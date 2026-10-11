import { SeloDoUsuario } from '../SeloDoUsuario';

export interface ChipDoUsuarioProps {
  user: { name: string; group: string };
  userLabel: string;
  userActive: boolean;
  onUserClick: (() => void) | undefined;
}

export function ChipDoUsuario({ user, userLabel, userActive, onUserClick }: ChipDoUsuarioProps) {
  return (
    <button
      type="button"
      onClick={onUserClick}
      title={userLabel}
      aria-current={userActive ? 'page' : undefined}
      style={{
        margin: '12px 10px 0',
        padding: '11px 8px 0',
        borderTop: '1px solid var(--color-line-strong)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        textAlign: 'left',
        cursor: onUserClick ? 'pointer' : 'default',
      }}
    >
      <SeloDoUsuario name={user.name} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', font: '600 13px var(--font-body)' }}>{user.name}</span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {user.group}
        </span>
      </span>
    </button>
  );
}
