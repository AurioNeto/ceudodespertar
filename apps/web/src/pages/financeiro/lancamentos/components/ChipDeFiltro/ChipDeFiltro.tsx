import type { ReactNode } from 'react';
import { TAMANHO_DO_CHIP } from './constantes';

export interface ChipDeFiltroProps {
  ativo: boolean;
  tamanho: keyof typeof TAMANHO_DO_CHIP;
  onEscolher: () => void;
  children: ReactNode;
}

export function ChipDeFiltro({ ativo, tamanho, onEscolher, children }: ChipDeFiltroProps) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onEscolher}
      style={{
        font: 'var(--text-small)',
        ...TAMANHO_DO_CHIP[tamanho],
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        background: ativo ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        color: ativo ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}
