import type { Conta } from '@cdd/contracts';
import { Icon } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';

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
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderLeft: `var(--edge-state) solid ${ativo ? 'var(--color-royal)' : 'transparent'}`,
        borderRadius: 'var(--radius)',
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
        <span
          data-numeric
          style={{ display: 'block', font: 'var(--text-amount)', color: divida > 0 ? 'var(--color-attention)' : 'var(--text-meta)' }}
        >
          {formatarDinheiro(divida)}
        </span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>em aberto</span>
      </span>
    </button>
  );
}
