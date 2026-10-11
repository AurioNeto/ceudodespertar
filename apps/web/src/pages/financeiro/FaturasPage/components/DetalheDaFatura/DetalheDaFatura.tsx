import type { Conta, Fatura } from '@cdd/contracts';
import { DomainError, Icon, StatusBadge, Cartao, Numero, Rotulo, type Density } from '@/ds';
import { competenciaPorExtenso, formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { ROTULO, TOM } from '../../constantes';
import { contasPagadoras } from '../../mocks/faturas';
import { totalDaFatura } from '../../utils/fatura';
import { AcoesDaFatura } from './components/AcoesDaFatura';
import { FormularioDePagamento } from './components/FormularioDePagamento';
import { TabelaDeCompras } from './components/TabelaDeCompras';

export interface DetalheDaFaturaProps {
  fatura: Fatura;
  cartao: Conta;
  densidade: Density;
  pagando: boolean;
  contaPagamento: string;
  dataPagamento: string;
  onFechar: () => void;
  onIniciarPagamento: () => void;
  onCancelarPagamento: () => void;
  onEscolherConta: (v: string) => void;
  onEscolherData: (v: string) => void;
  onConfirmarPagamento: () => void;
}

export function DetalheDaFatura({
  fatura,
  cartao,
  densidade,
  pagando,
  contaPagamento,
  dataPagamento,
  onFechar,
  onIniciarPagamento,
  onCancelarPagamento,
  onEscolherConta,
  onEscolherData,
  onConfirmarPagamento,
}: DetalheDaFaturaProps) {
  const campo = densidade === 'field';
  const total = totalDaFatura(fatura);
  const aConferir = fatura.compras.filter((c) => c.status === 'A_CONFERIR').length;
  const contaPaga = contasPagadoras.find((c) => c.id === fatura.contaPagamentoId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <Cartao campo={campo}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {cartao.nome} · {competenciaPorExtenso(fatura.competencia)}
          </span>
          <StatusBadge tone={TOM[fatura.status]}>{ROTULO[fatura.status]}</StatusBadge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))',
            gap: 14,
          }}
        >
          <Numero rotulo="Total da fatura" valor={formatarDinheiro(total)} destaque />
          <Numero rotulo="Compras" valor={String(fatura.compras.length)} />
          <Numero rotulo="Fecha em" valor={formatarData(fatura.dataFechamento)} />
          <Numero rotulo="Vence em" valor={formatarData(fatura.dataVencimento)} />
        </div>

        {fatura.status === 'PAGA' ? (
          <div style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Icon name="circle-check" size={16} />
            Paga em {formatarData(fatura.pagaEm!)}
            {contaPaga ? ` por transferência de ${contaPaga.nome}` : ''}.
          </div>
        ) : null}

        {cartao.alerta ? (
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Icon name="triangle-alert" size={16} color="var(--color-pending)" style={{ marginTop: 2 }} />
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{cartao.alerta}</span>
          </div>
        ) : null}
      </Cartao>

      <DomainError
        rule="Pagar a fatura não é uma despesa nova"
        explanation="Cada compra abaixo já entrou como saída na data em que foi feita. O pagamento apenas quita o cartão, e é registrado como transferência da conta escolhida."
        way="É por isso que a fatura existe como agregado: sem ela, a compra e o pagamento entram os dois como despesa e o mês fecha com o dobro do que saiu."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <Rotulo>Compras desta fatura</Rotulo>
        <TabelaDeCompras fatura={fatura} densidade={densidade} total={total} />
      </div>

      {pagando ? (
        <FormularioDePagamento
          total={total}
          densidade={densidade}
          conta={contaPagamento}
          data={dataPagamento}
          onEscolherConta={onEscolherConta}
          onEscolherData={onEscolherData}
          onConfirmar={onConfirmarPagamento}
          onCancelar={onCancelarPagamento}
        />
      ) : (
        <AcoesDaFatura
          status={fatura.status}
          aConferir={aConferir}
          onFechar={onFechar}
          onPagar={onIniciarPagamento}
        />
      )}
    </div>
  );
}
