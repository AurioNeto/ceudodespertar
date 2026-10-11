import type { CSSProperties } from 'react';

export const TAMANHO_DO_CHIP = {
  amplo: { padding: '9px 13px', minHeight: 40 },
  compacto: { padding: '8px 14px', minHeight: 38 },
} as const satisfies Record<string, CSSProperties>;
