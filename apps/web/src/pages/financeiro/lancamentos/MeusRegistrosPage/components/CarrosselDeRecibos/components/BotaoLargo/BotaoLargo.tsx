import { vidroLeve } from '@/ds';
export interface BotaoLargoProps {
  rotulo: string;
  onClick: () => void;
}

export function BotaoLargo({ rotulo, onClick }: BotaoLargoProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minHeight: 48,
        border: '1px solid var(--color-line-strong)',
        background: 'var(--bg-card)',
        ...vidroLeve,
        borderRadius: 'var(--leaf-md)',
        cursor: 'pointer',
        font: 'var(--text-body-strong)',
        color: 'var(--text-primary)',
      }}
    >
      {rotulo}
    </button>
  );
}
