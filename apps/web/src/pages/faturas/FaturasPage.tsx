import { useMemo, useState } from 'react';
import type { Conta, ContaId, Fatura, StatusFatura } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { Button, DomainError, EmptyState, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Select } from '../../components/Campo';
import { Cartao, Numero, Recado, Rotulo, Td, Th } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { competenciaPorExtenso, formatarData, formatarDinheiro, pluralizar } from '../../lib/formato';
import { cartoes, contasPagadoras, faturas as faturasIniciais, totalDaFatura } from '../../mocks/faturas';
import { hoje } from '../../mocks/sessao';

const TOM: Record<StatusFatura, BadgeTone> = {
  ABERTA: 'royal',
  FECHADA: 'pending',
  PAGA: 'confirmed',
};

const ROTULO: Record<StatusFatura, string> = {
  ABERTA: 'Aberta',
  FECHADA: 'Fechada, a pagar',
  PAGA: 'Paga',
};

/** O que a casa ainda deve neste cartão: tudo que não foi pago. */
const dividaDoCartao = (lista: readonly Fatura[], contaId: ContaId) =>
  lista.filter((f) => f.contaId === contaId && f.status !== 'PAGA').reduce((soma, f) => soma + totalDaFatura(f), 0);

export function FaturasPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [faturas, setFaturas] = useState<readonly Fatura[]>(faturasIniciais);
  const [cartaoId, setCartaoId] = useState<ContaId>(cartoes[0]!.id);
  const [faturaId, setFaturaId] = useState(faturasIniciais.find((f) => f.status === 'FECHADA')!.id);
  const [pagando, setPagando] = useState(false);
  const [contaPagamento, setContaPagamento] = useState<string>(contasPagadoras[0]!.id);
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [recado, setRecado] = useState<string | null>(null);

  const doCartao = useMemo(() => faturas.filter((f) => f.contaId === cartaoId), [faturas, cartaoId]);
  const fatura = doCartao.find((f) => f.id === faturaId) ?? doCartao[0];
  const cartao = cartoes.find((c) => c.id === cartaoId)!;

  const escolherCartao = (c: Conta) => {
    setCartaoId(c.id);
    const primeira = faturas.find((f) => f.contaId === c.id && f.status !== 'PAGA') ?? faturas.find((f) => f.contaId === c.id);
    if (primeira) setFaturaId(primeira.id);
    setPagando(false);
    setRecado(null);
  };

  const fechar = () => {
    if (!fatura) return;
    setFaturas((lista) => lista.map((f) => (f.id === fatura.id ? { ...f, status: 'FECHADA' } : f)));
    setRecado('Fatura fechada. Compras novas neste cartão entram na fatura da competência seguinte.');
  };

  const pagar = () => {
    if (!fatura) return;
    setFaturas((lista) =>
      lista.map((f) =>
        f.id === fatura.id
          ? { ...f, status: 'PAGA', pagaEm: dataLocal(dataPagamento), contaPagamentoId: contaPagamento as ContaId }
          : f,
      ),
    );
    setPagando(false);
    setRecado('Pagamento registrado como transferência. Nenhuma despesa nova foi criada — as compras já estavam lançadas.');
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-09' : 'F-09 · Faturas de cartão'}
        title="Faturas de cartão"
        subtitle={campo ? undefined : 'A compra é despesa; pagar a fatura é transferência · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1180,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 12 }}>
          {cartoes.map((c) => (
            <CartaoDoTopo
              key={c.id}
              cartao={c}
              divida={dividaDoCartao(faturas, c.id)}
              ativo={c.id === cartaoId}
              onEscolher={() => escolherCartao(c)}
            />
          ))}
        </div>

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : '272px minmax(0,1fr)',
            gap: campo ? 14 : 20,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Rotulo>Faturas de {cartao.nome}</Rotulo>
            {doCartao.map((f) => (
              <LinhaDaFatura
                key={f.id}
                fatura={f}
                ativa={f.id === fatura?.id}
                onAbrir={() => {
                  setFaturaId(f.id);
                  setPagando(false);
                  setRecado(null);
                }}
              />
            ))}
          </div>

          {fatura ? (
            <DetalheDaFatura
              fatura={fatura}
              cartao={cartao}
              campo={campo}
              pagando={pagando}
              contaPagamento={contaPagamento}
              dataPagamento={dataPagamento}
              onFechar={fechar}
              onIniciarPagamento={() => setPagando(true)}
              onCancelarPagamento={() => setPagando(false)}
              onEscolherConta={setContaPagamento}
              onEscolherData={setDataPagamento}
              onConfirmarPagamento={pagar}
            />
          ) : (
            <EmptyState
              title="Nenhuma fatura neste cartão"
              description="A primeira fatura nasce com a primeira compra registrada nesta conta."
            />
          )}
        </div>
      </div>
    </>
  );
}

function CartaoDoTopo({
  cartao,
  divida,
  ativo,
  onEscolher,
}: {
  cartao: Conta;
  divida: number;
  ativo: boolean;
  onEscolher: () => void;
}) {
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

function LinhaDaFatura({ fatura, ativa, onAbrir }: { fatura: Fatura; ativa: boolean; onAbrir: () => void }) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-current={ativa ? 'true' : undefined}
      style={{
        textAlign: 'left',
        background: ativa ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${ativa ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: '11px 13px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {competenciaPorExtenso(fatura.competencia)}
        </span>
        <StatusBadge tone={TOM[fatura.status]}>{ROTULO[fatura.status]}</StatusBadge>
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
          {formatarDinheiro(totalDaFatura(fatura))}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(fatura.compras.length, 'compra')}
        </span>
      </span>
    </button>
  );
}

interface DetalheProps {
  fatura: Fatura;
  cartao: Conta;
  campo: boolean;
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

function DetalheDaFatura({
  fatura,
  cartao,
  campo,
  pagando,
  contaPagamento,
  dataPagamento,
  onFechar,
  onIniciarPagamento,
  onCancelarPagamento,
  onEscolherConta,
  onEscolherData,
  onConfirmarPagamento,
}: DetalheProps) {
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
        <TabelaDeCompras fatura={fatura} campo={campo} total={total} />
      </div>

      {pagando ? (
        <FormularioDePagamento
          total={total}
          campo={campo}
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

function TabelaDeCompras({ fatura, campo, total }: { fatura: Fatura; campo: boolean; total: number }) {
  if (fatura.compras.length === 0) {
    return (
      <EmptyState
        title="Nenhuma compra ainda"
        description="As compras aparecem aqui conforme forem registradas neste cartão."
      />
    );
  }

  return (
    <div
      style={{
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 460 : undefined }}>
        <thead>
          <tr style={{ background: 'var(--bg-sunken)' }}>
            <Th>Data</Th>
            <Th>Compra</Th>
            {campo ? null : <Th>Grupo</Th>}
            {campo ? null : <Th>Quem registrou</Th>}
            <Th alinharDireita>Valor</Th>
          </tr>
        </thead>
        <tbody>
          {fatura.compras.map((c) => (
            <tr key={c.id} style={{ borderTop: '1px solid var(--color-line)' }}>
              <Td>
                <span data-numeric style={{ color: 'var(--text-secondary)' }}>
                  {formatarData(c.data).slice(0, 5)}
                </span>
              </Td>
              <Td>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{c.motivo}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-meta)' }}>{c.categoria}</span>
                    {c.status === 'A_CONFERIR' ? <StatusBadge tone="pending" /> : null}
                  </span>
                </span>
              </Td>
              {campo ? null : <Td>{c.grupo ?? '—'}</Td>}
              {campo ? null : <Td>{c.registradoPorNome}</Td>}
              <Td alinharDireita>
                <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
                  {formatarDinheiro(c.valor)}
                </span>
              </Td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--color-line-strong)', background: 'var(--bg-sunken)' }}>
            <Td>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Total</span>
            </Td>
            <Td />
            {campo ? null : <Td />}
            {campo ? null : <Td />}
            <Td alinharDireita>
              <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
                {formatarDinheiro(total)}
              </span>
            </Td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AcoesDaFatura({
  status,
  aConferir,
  onFechar,
  onPagar,
}: {
  status: StatusFatura;
  aConferir: number;
  onFechar: () => void;
  onPagar: () => void;
}) {
  if (status === 'PAGA') {
    return (
      <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Fatura paga. Correção só por estorno do lançamento de origem.
      </div>
    );
  }

  if (status === 'ABERTA') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Button iconName="lock" onClick={onFechar}>
          Fechar fatura
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '52ch' }}>
          Depois de fechada, compra nova neste cartão entra na fatura seguinte.
          {aConferir > 0 ? ` ${pluralizar(aConferir, 'compra')} ainda a conferir — fechar a fatura não confere ninguém.` : ''}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <Button iconName="arrow-left-right" onClick={onPagar}>
        Registrar pagamento
      </Button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Grava uma transferência da conta escolhida para o cartão.
      </span>
    </div>
  );
}

function FormularioDePagamento({
  total,
  campo,
  conta,
  data,
  onEscolherConta,
  onEscolherData,
  onConfirmar,
  onCancelar,
}: {
  total: number;
  campo: boolean;
  conta: string;
  data: string;
  onEscolherConta: (v: string) => void;
  onEscolherData: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--color-royal-border)',
        borderLeft: 'var(--edge-state) solid var(--color-royal)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
      }}
    >
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Registrar o pagamento</span>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <Select
          label="Conta de saída"
          value={conta}
          options={contasPagadoras.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={onEscolherConta}
        />
        <TextField label="Data do pagamento" type="date" value={data} onChange={(e) => onEscolherData(e.target.value)} />
        <TextField
          label="Valor"
          value={formatarDinheiro(total)}
          readOnly
          hint="igual ao total da fatura, sem edição"
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button iconName="check" onClick={onConfirmar}>
          Confirmar pagamento
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '46ch' }}>
          Isto grava uma transferência, não um lançamento de despesa.
        </span>
      </div>
    </div>
  );
}
