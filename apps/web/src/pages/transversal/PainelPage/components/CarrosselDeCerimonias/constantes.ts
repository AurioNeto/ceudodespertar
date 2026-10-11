import type { CSSProperties } from 'react';

export const PAINEIS = ['Próxima cerimônia', 'Resultado por cerimônia', 'Última cerimônia'] as const;

export const ESTILO_DA_SETA = {
  background: 'var(--bg-card)',
  border: 'var(--border-hairline)',
  color: 'var(--color-royal)',
} satisfies CSSProperties;
