import type { Conta } from '@cdd/contracts';
import type { Density } from '@/ds';
import { formatarDinheiro, pluralizar } from '@/pages/utils/formato';
import { rotuloLabel } from '../../constantes';
import { ehCaixa } from '../../utils/conta';
import { BlocoDoResumo } from './components/BlocoDoResumo';

export interface ResumoDoSaldoProps {
  contasAtivas: readonly Conta[];
  emBanco: number;
  emCaixa: number;
  fundoProprio: number;
  densidade: Density;
}

export function ResumoDoSaldo({ contasAtivas, emBanco, emCaixa, fundoProprio, densidade }: ResumoDoSaldoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-brand)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? '16px 18px' : '18px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: campo ? 14 : 22,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 260px' }}>
        <span style={rotuloLabel}>Saldo consolidado da unidade</span>
        <span
          style={{
            font: 'var(--text-amount-hero)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-royal-deep)',
          }}
        >
          {formatarDinheiro(emBanco + emCaixa)}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          posição de hoje, 09:12 · {pluralizar(contasAtivas.length, 'conta ativa', 'contas ativas')}
        </span>
      </div>
      <BlocoDoResumo
        rotulo="Em banco"
        valor={emBanco}
        nota={pluralizar(contasAtivas.filter((c) => !ehCaixa(c)).length, 'conta')}
      />
      <BlocoDoResumo rotulo="Em espécie" valor={emCaixa} nota="caixa da chácara" />
      <BlocoDoResumo rotulo="Fundo próprio" valor={fundoProprio} nota="parte do saldo, já com destino" />
    </div>
  );
}
