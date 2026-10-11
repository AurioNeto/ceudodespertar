import type { ReactNode } from 'react';

export interface BotaoDaPerguntaProps {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}

export function BotaoDaPergunta({ rotulo, onClick, children }: BotaoDaPerguntaProps) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        border: '1px solid var(--color-line)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
