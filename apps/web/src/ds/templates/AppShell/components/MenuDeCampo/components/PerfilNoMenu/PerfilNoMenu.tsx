import { SeloDoUsuario } from '../../../SeloDoUsuario';

interface PerfilNoMenuProps {
  user: { name: string; group: string };
  rotulo: string;
  ativo: boolean;
  aoAbrir: () => void;
}

export function PerfilNoMenu({ user, rotulo, ativo, aoAbrir }: PerfilNoMenuProps) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-current={ativo ? 'page' : undefined}
      style={{
        marginTop: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-2)',
        minHeight: 'var(--target-field)',
        borderTop: '1px solid var(--color-line-strong)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        textAlign: 'left',
      }}
    >
      <SeloDoUsuario name={user.name} decorativo />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', font: '600 13.5px var(--font-body)' }}>{rotulo}</span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {user.name} · {user.group}
        </span>
      </span>
    </button>
  );
}
