import type { CSSProperties } from 'react';

export const FUNDO_POR_VARIANTE = {
  folha: { alignItems: 'flex-end', justifyContent: 'center' },
  lateral: { alignItems: 'stretch', justifyContent: 'flex-end' },
  central: { alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' },
} satisfies Record<string, CSSProperties>;

export const DIALOGO_POR_VARIANTE = {
  folha: {
    width: '100%',
    maxHeight: '90dvh',
    borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
    boxShadow: 'var(--shadow-sheet)',
  },
  lateral: {
    width: 'min(440px, 100vw)',
    height: '100%',
    borderRadius: 0,
    boxShadow: 'var(--shadow-raised)',
    borderLeft: 'var(--border-hairline)',
  },
  central: {
    width: 'min(640px, 100%)',
    maxHeight: '100%',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-raised)',
  },
} satisfies Record<string, CSSProperties>;
