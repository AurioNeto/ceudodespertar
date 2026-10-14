import type { ContaComSaldo as Conta } from '@cdd/contracts';
import { AmountDisplay, Icon, vidroLeve } from '@/ds';

export interface CartaoDoTopoProps {
  cartao: Conta;
  divida: number;
  ativo: boolean;
  onEscolher: () => void;
}

export function CartaoDoTopo({ cartao, divida, ativo, onEscolher }: CartaoDoTopoProps) {
  return (
    <button
      type="button"
      onClick={onEscolher}
      aria-pressed={ativo}
      style={{
        textAlign: 'left',
        background: 'var(--bg-card)',
        ...vidroLeve,
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderLeft: `var(--edge-state) solid ${ativo ? 'var(--color-royal)' : 'transparent'}`,
        borderRadius: 'var(--leaf-md)',
        padding: '13px 16px',
        cursor: 'pointer',
        boxShadow: ativo ? 'var(--shadow-raised)' : 'none',
        display: 'flex',
        gap: 13,
        alignItems: 'center',
      }}
    >
      <Icon name="credit-card" size={20} color={ativo ? 'var(--color-royal)' : 'var(--text-meta)'} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{cartao.nome}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{cartao.descricao}</span>
      </span>
      <span style={{ textAlign: 'right' }}>
        <AmountDisplay
          value={divida / 100}
          size="sm"
          style={{ color: divida > 0 ? 'var(--color-attention)' : 'var(--text-meta)' }}
        />
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>em aberto</span>
      </span>
    </button>
  );
}
