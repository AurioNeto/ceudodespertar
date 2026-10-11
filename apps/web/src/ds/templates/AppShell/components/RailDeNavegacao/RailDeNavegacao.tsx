import { Fragment } from 'react';
import type { ReactNode, Ref } from 'react';
import { isSection, type NavEntry } from '../../navegacao';
import type { AppShellBrand } from '../../tipos';
import { NavItem } from '../NavItem';
import { RotuloDeSecao } from '../RotuloDeSecao';

export interface RailDeNavegacaoProps {
  ref: Ref<HTMLElement>;
  brand: AppShellBrand;
  nav: readonly NavEntry[];
  activeId: string | undefined;
  onNavigate: ((id: string) => void) | undefined;
  children: ReactNode;
}

export function RailDeNavegacao({ ref, brand, nav, activeId, onNavigate, children }: RailDeNavegacaoProps) {
  return (
    <aside
      ref={ref}
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
          {brand.lines.map((linha, posicao) => (
            <Fragment key={`${posicao}-${linha}`}>
              {posicao > 0 ? <br /> : null}
              {linha}
            </Fragment>
          ))}
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
          {brand.tagline}
        </div>
        <div style={{ marginTop: 14, height: 1, background: 'var(--color-line-gold)' }} />
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', flex: 1 }}>
        {nav.map((item) =>
          isSection(item) ? (
            <RotuloDeSecao key={item.section}>{item.section}</RotuloDeSecao>
          ) : (
            <NavItem key={item.id} item={item} active={item.id === activeId} onNavigate={onNavigate} />
          ),
        )}
      </nav>

      {children}
    </aside>
  );
}
