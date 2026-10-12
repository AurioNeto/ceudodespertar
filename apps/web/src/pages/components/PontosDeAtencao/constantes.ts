import type { CSSProperties } from 'react';

export const MOLDURA_DOS_PONTOS = {
  ampla: { gap: 10, padding: '14px 16px', borderRadius: 'var(--leaf-md)' },
  compacta: { gap: 8, padding: '12px 14px', borderRadius: 'var(--leaf-md)' },
} as const satisfies Record<string, CSSProperties>;
