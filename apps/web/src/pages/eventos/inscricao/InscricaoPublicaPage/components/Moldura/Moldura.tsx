import type { ReactNode } from 'react';
import { FaixaDeDemonstracao, FlowerOfLife, type Density } from '@/ds';
import { eventoDoLink } from '../../../mocks/linkDaCerimonia';
import type { Passo } from '../../tipos';
import { ORDEM } from './constantes';

export interface MolduraProps {
  densidade: Density;
  passo: Passo;
  children: ReactNode;
}

export function Moldura({ densidade, passo, children }: MolduraProps) {
  const campo = densidade === 'field';
  const indice = ORDEM.indexOf(passo);
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-brand)',
          borderBottom: '1px solid var(--color-line-gold)',
          padding: campo ? '18px 18px 16px' : '26px 32px 22px',
        }}
      >
        {campo ? null : (
          <div aria-hidden style={{ position: 'absolute', width: 380, height: 380, right: -110, top: -120 }}>
            <FlowerOfLife />
          </div>
        )}
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div
            style={{
              font: campo ? '800 15px/1.05 var(--font-display)' : '800 22px/1.02 var(--font-display)',
              letterSpacing: '.01em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-brand)',
            }}
          >
            Céu do Despertar
          </div>
          <div style={{ marginTop: 7, font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {eventoDoLink.nome} — {eventoDoLink.data}
          </div>
          <div style={{ marginTop: 3, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {eventoDoLink.local} · inscrição
          </div>

          <div style={{ marginTop: 13, display: 'flex', gap: 5 }}>
            {ORDEM.slice(0, -1).map((x, i) => (
              <span
                key={x}
                aria-hidden
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 'var(--radius-pill)',
                  background: i <= indice ? 'var(--color-ink-brand)' : 'var(--color-line-gold)',
                }}
              />
            ))}
          </div>
        </div>
      </header>

      <FaixaDeDemonstracao />

      <main
        className="cdd-papel-estampado"
        style={{ flex: 1, padding: campo ? '16px 16px 40px' : '26px 32px 48px', overflow: 'auto' }}
      >
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
