import type { ReactNode } from 'react';

const rotulo = {
  font: 'var(--text-label)',
  letterSpacing: 'var(--tracking-label)',
  textTransform: 'uppercase',
  color: 'var(--text-field-label)',
  marginBottom: 7,
} as const;

export function RotuloDeCampo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} style={rotulo}>
      {children}
    </label>
  );
}
