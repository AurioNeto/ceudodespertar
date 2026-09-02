import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import type { Density } from './Button';

export interface NavLink {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

export interface NavSection {
  section: string;
}

export type NavEntry = NavLink | NavSection;

const isSection = (e: NavEntry): e is NavSection => 'section' in e;

export interface AppShellProps {
  institution?: string;
  unit?: string;
  user: { name: string; group: string };
  nav?: readonly NavEntry[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  onUnitClick?: () => void;
  onUserClick?: () => void;
  density?: Density;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * v3: o rail não é um bloco azul-marinho. É papel esfriado — royal a 8% —
 * com tinta royal, fio na borda e o item ativo em cartão branco.
 */
export function AppShell({
  institution = 'Céu do Despertar',
  unit = 'CDD',
  user,
  nav = [],
  activeId,
  onNavigate,
  onUnitClick,
  onUserClick,
  density = 'office',
  children,
  style,
}: AppShellProps) {
  const field = density === 'field';
  const links = nav.filter((n): n is NavLink => !isSection(n));

  return (
    <div
      data-density={density}
      style={{
        display: 'grid',
        gridTemplateColumns: field ? '1fr' : '232px 1fr',
        height: '100%',
        minHeight: 0,
        background: 'var(--bg-app)',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {field ? null : (
        <aside
          style={{
            background: 'var(--bg-rail)',
            borderRight: '1px solid var(--color-line-strong)',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 0 14px',
            overflow: 'auto',
          }}
        >
          <div style={{ padding: '0 18px 18px' }}>
            <div
              style={{
                font: '800 15px/1.05 var(--font-display)',
                letterSpacing: '.01em',
                textTransform: 'uppercase',
                color: 'var(--color-ink-brand)',
              }}
            >
              Céu do
              <br />
              Despertar
            </div>
            <div
              style={{
                marginTop: 7,
                font: 'var(--text-label)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--text-field-label)',
              }}
            >
              Sistema de gestão
            </div>
            <div style={{ marginTop: 14, height: 1, background: 'var(--color-line-gold)' }} />
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', flex: 1 }}>
            {nav.map((item) =>
              isSection(item) ? (
                <div
                  key={item.section}
                  style={{
                    font: 'var(--text-label)',
                    letterSpacing: 'var(--tracking-label)',
                    textTransform: 'uppercase',
                    color: 'var(--text-meta)',
                    padding: '16px 8px 6px',
                  }}
                >
                  {item.section}
                </div>
              ) : (
                <NavItem key={item.id} item={item} active={item.id === activeId} onNavigate={onNavigate} />
              ),
            )}
          </nav>

          <button
            type="button"
            onClick={onUserClick}
            title="Meu perfil"
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
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 'var(--radius-sm)',
                flex: '0 0 auto',
                background: 'var(--color-royal)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                font: '700 12px var(--font-data)',
              }}
            >
              {(user.name || '?').slice(0, 2).toUpperCase()}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', font: '600 13px var(--font-body)' }}>{user.name}</span>
              <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {user.group}
              </span>
            </span>
          </button>
        </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
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

        <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto' }}>{children}</main>

        {field && links.length ? (
          <nav style={{ display: 'flex', background: 'var(--bg-card)', borderTop: '1px solid var(--color-line)' }}>
            {links.slice(0, 4).map((item) => {
              const on = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  style={{
                    flex: 1,
                    minHeight: 'var(--target-field)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    color: on ? 'var(--color-royal)' : 'var(--text-secondary)',
                    borderTop: `2px solid ${on ? 'var(--color-royal)' : 'transparent'}`,
                  }}
                >
                  <Icon name={item.icon} size={20} />
                  <span style={{ font: '600 10.5px var(--font-body)' }}>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavLink;
  active: boolean;
  onNavigate?: (id: string) => void;
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
        minHeight: 'var(--target-office)',
        padding: '0 10px',
        borderRadius: 'var(--radius-sm)',
        color: active ? 'var(--color-royal-deep)' : 'var(--text-primary)',
        background: active ? 'var(--bg-card)' : hot ? 'rgba(26,61,168,.06)' : 'transparent',
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
      {item.count ? (
        <span
          data-numeric
          style={{
            font: '600 11.5px var(--font-data)',
            background: 'var(--color-pending-soft)',
            color: 'var(--color-pending)',
            borderRadius: 'var(--radius-pill)',
            padding: '1px 7px',
          }}
        >
          {item.count}
        </span>
      ) : null}
    </button>
  );
}
