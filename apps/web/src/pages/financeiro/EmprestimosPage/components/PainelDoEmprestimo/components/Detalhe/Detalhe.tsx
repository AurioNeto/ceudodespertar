import type { Emprestimo } from '@cdd/contracts';
import { BarraDeProporcao, StatusBadge, Cartao, Numero, type Density } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { DIRECAO } from '../../../../constantes';
import { devolvido, saldoDevedor } from '../../../../utils/saldo';

export interface DetalheProps {
  emprestimo: Emprestimo;
  densidade: Density;
}

export function Detalhe({ emprestimo, densidade }: DetalheProps) {
  const campo = densidade === 'field';
  const d = DIRECAO[emprestimo.direcao];
  const saldo = saldoDevedor(emprestimo);

  return (
    <Cartao campo={campo}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{emprestimo.contraparteNome}</span>
        <StatusBadge tone={emprestimo.direcao === 'CONCEDIDO' ? 'royal' : 'pending'}>{d.rotulo}</StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {d.verbo} em {formatarData(emprestimo.dataConcessao)} · {emprestimo.motivo}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
          gap: 14,
        }}
      >
        <Numero rotulo="Principal" valor={formatarDinheiro(emprestimo.valorPrincipal)} />
        <Numero rotulo="Já devolvido" valor={formatarDinheiro(devolvido(emprestimo))} cor="var(--color-confirmed)" />
        <Numero
          rotulo={d.saldoRotulo}
          valor={formatarDinheiro(saldo)}
          destaque
          cor={saldo === 0 ? 'var(--color-confirmed)' : undefined}
        />
        <Numero rotulo="Conta de origem" valor={emprestimo.contaNome} />
      </div>

      <BarraDeProporcao
        parte={devolvido(emprestimo)}
        total={emprestimo.valorPrincipal}
        cor={saldo === 0 ? 'var(--color-confirmed)' : 'var(--color-royal)'}
      />

      {emprestimo.observacao ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{emprestimo.observacao}</span>
      ) : null}
    </Cartao>
  );
}
