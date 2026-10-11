import { Icon } from '../../../../atoms/Icon';
import type { Density } from '../../../../fundacao/densidade';

export interface BarraDeContextoProps {
  institution: string;
  unit: string;
  user: { name: string; group: string };
  onUnitClick: (() => void) | undefined;
  densidade: Density;
}

export function BarraDeContexto({ institution, unit, user, onUnitClick, densidade }: BarraDeContextoProps) {
  const field = densidade === 'field';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: field ? 'var(--bg-rail)' : 'var(--bg-card)',
        borderBottom: '1px solid var(--color-line)',
        borderTop: field ? '2px solid var(--color-royal)' : 0,
        padding: field ? '11px 16px' : '0 20px',
        minHeight: field ? 56 : 52,
        flex: '0 0 auto',
      }}
    >
      <span
        style={{
          font: 'var(--text-label)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          color: 'var(--text-field-label)',
        }}
      >
        {institution}
      </span>
      <button
        type="button"
        onClick={onUnitClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          font: '600 13px var(--font-body)',
          padding: '5px 10px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--color-royal-soft)',
          color: 'var(--color-royal-ink)',
        }}
      >
        {unit}
        <Icon name="chevron-down" size={14} />
      </button>
      <span style={{ flex: 1 }} />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {field ? user.name : user.group}
      </span>
    </header>
  );
}
