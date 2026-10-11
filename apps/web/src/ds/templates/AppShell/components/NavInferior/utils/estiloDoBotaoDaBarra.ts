import type { CSSProperties } from 'react';

export const estiloDoBotaoDaBarra = (ativo: boolean): CSSProperties => ({
  position: 'relative',
  flex: 1,
  minHeight: 'var(--target-field)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  color: ativo ? 'var(--color-royal)' : 'var(--text-secondary)',
  borderTop: `2px solid ${ativo ? 'var(--color-royal)' : 'transparent'}`,
});
