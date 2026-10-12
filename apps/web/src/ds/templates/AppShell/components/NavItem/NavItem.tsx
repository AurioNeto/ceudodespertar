import { useState } from 'react';
import { Icon } from '../../../../atoms/Icon';
import type { Density } from '../../../../fundacao/densidade';
import type { NavLink } from '../../navegacao';
import { SeloDeContagem } from '../SeloDeContagem';

export function NavItem({
  item,
  active,
  onNavigate,
  densidade = 'office',
}: {
  item: NavLink;
  active: boolean;
  onNavigate?: (id: string) => void;
  densidade?: Density;
}) {
  const [hot, setHot] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onNavigate?.(item.id)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        minHeight: densidade === 'field' ? 'var(--target-field)' : 'var(--target-office)',
        padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--color-royal-deep)' : 'var(--text-primary)',
        background: active ? 'var(--bg-card)' : hot ? 'var(--bg-hover)' : 'transparent',
        boxShadow: active ? 'var(--shadow-raised)' : 'none',
        font: active ? '600 13.5px var(--font-body)' : '400 13.5px var(--font-body)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'background var(--motion-fast)',
      }}
    >
      {active ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 'var(--edge-state)',
            background: 'var(--color-royal)',
          }}
        />
      ) : null}
      <Icon name={item.icon} size={17} color={active ? 'var(--color-royal)' : 'var(--text-meta)'} />
      <span style={{ flex: 1 }}>{item.label}</span>
      <SeloDeContagem count={item.count} />
    </button>
  );
}
