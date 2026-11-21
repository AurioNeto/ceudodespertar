import type { ContaComSaldo as Conta, DataLocal } from '@cdd/contracts';
import { AmountDisplay, Rotulo, type Density } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { ehCaixa, textoDaUltimaConciliacao } from '../../utils/conta';
import { BlocoDoResumo } from './components/BlocoDoResumo';

export interface ResumoDoSaldoProps {
  contasAtivas: readonly Conta[];
  emBanco: number;
  emCaixa: number;
  fundoProprio: number;
  ultimaConciliacao: DataLocal | null;
  densidade: Density;
}

export function ResumoDoSaldo({
  contasAtivas,
  emBanco,
  emCaixa,
  fundoProprio,
  ultimaConciliacao,
  densidade,
}: ResumoDoSaldoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-brand)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--leaf-lg)',
        padding: campo ? '16px 18px' : '18px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: campo ? 14 : 22,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 260px' }}>
        <Rotulo>Saldo consolidado da unidade</Rotulo>
        <AmountDisplay value={(emBanco + emCaixa) / 100} size="hero" style={{ color: 'var(--color-royal-deep)' }} />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {textoDaUltimaConciliacao(ultimaConciliacao)} · {pluralizar(contasAtivas.length, 'conta ativa', 'contas ativas')}
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
