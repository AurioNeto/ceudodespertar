import type { Emprestimo } from '@cdd/contracts';
import { BarraDeProporcao, Icon, StatusBadge } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { DIRECAO } from '../../constantes';
import { devolvido, saldoDevedor } from '../../utils/saldo';

export interface LinhaDoEmprestimoProps {
  emprestimo: Emprestimo;
  ativo: boolean;
  onAbrir: () => void;
}

export function LinhaDoEmprestimo({ emprestimo, ativo, onAbrir }: LinhaDoEmprestimoProps) {
  const saldo = saldoDevedor(emprestimo);
  const estaQuitado = saldo === 0;

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={ativo ? 'true' : undefined}
      style={{
        textAlign: 'left',
        background: ativo ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon
          name={emprestimo.direcao === 'CONCEDIDO' ? 'arrow-up-right' : 'arrow-down-left'}
          size={16}
          color={emprestimo.direcao === 'CONCEDIDO' ? 'var(--color-royal)' : 'var(--color-pending)'}
        />
        <span style={{ flex: 1, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {emprestimo.contraparteNome}
        </span>
        {estaQuitado ? <StatusBadge tone="confirmed">Quitado</StatusBadge> : null}
      </span>

      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          data-numeric
          style={{ font: 'var(--text-amount)', color: estaQuitado ? 'var(--text-meta)' : 'var(--text-primary)' }}
        >
          {formatarDinheiro(estaQuitado ? emprestimo.valorPrincipal : saldo)}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {estaQuitado ? 'devolvido por inteiro' : DIRECAO[emprestimo.direcao].saldoRotulo.toLowerCase()}
        </span>
      </span>

      <BarraDeProporcao
        parte={devolvido(emprestimo)}
        total={emprestimo.valorPrincipal}
        cor={estaQuitado ? 'var(--color-confirmed)' : 'var(--color-royal)'}
      />
    </button>
  );
}
