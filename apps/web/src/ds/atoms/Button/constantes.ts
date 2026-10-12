import type { CSSProperties } from 'react';

export const VARIANTS = {
  primary: { background: 'var(--action-bg)', color: 'var(--action-fg)', border: '1.5px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--color-royal)', border: '1.5px solid var(--color-royal-border)' },
  quiet: { background: 'var(--bg-sunken)', color: 'var(--text-primary)', border: '1px solid var(--color-line)' },
  suggest: {
    background: 'var(--color-suggest-soft)',
    color: 'var(--color-suggest)',
    border: '1.5px solid var(--color-suggest-border)',
  },
  onChrome: { background: 'var(--chrome-overlay)', color: 'var(--text-on-chrome)', border: '1.5px solid var(--chrome-border)' },
} satisfies Record<string, CSSProperties>;

export const HOVER = {
  primary: 'var(--action-bg-hover)',
  ghost: 'var(--color-royal-soft)',
  quiet: 'var(--color-line)',
  suggest: 'var(--color-suggest-border)',
  onChrome: 'var(--chrome-overlay-strong)',
} satisfies Record<keyof typeof VARIANTS, string>;
