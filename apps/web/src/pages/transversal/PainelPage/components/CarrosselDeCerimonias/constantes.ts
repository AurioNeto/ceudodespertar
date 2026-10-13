import type { CSSProperties } from 'react';
import { vidroLeve } from '@/ds';

export const PAINEIS = ['Próxima cerimônia', 'Resultado por cerimônia', 'Última cerimônia'] as const;

export const ESTILO_DA_SETA = {
  background: 'var(--bg-card)',
  ...vidroLeve,
  border: 'var(--border-hairline)',
  color: 'var(--color-royal)',
} satisfies CSSProperties;
