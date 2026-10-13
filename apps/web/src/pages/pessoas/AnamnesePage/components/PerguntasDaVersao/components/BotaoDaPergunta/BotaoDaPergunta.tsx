import type { ReactNode } from 'react';
import { vidroLeve } from '@/ds';

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
        ...vidroLeve,
        borderRadius: 'var(--leaf-xs)',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
