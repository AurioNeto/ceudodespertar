import { useState } from 'react';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge, type BadgeTone, type IconName } from '../../ds';
import { SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { formatarDiaMes, formatarDinheiro, pluralizar } from '../../lib/formato';
import { contas as contasIniciais, fundos as fundosIniciais, fundoProprio } from '../../mocks/financeiro';
import { GerenciarContasModal } from './GerenciarContasModal';

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const valorGrande = {
  font: 'var(--text-amount-lg)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;

const valorMedio = {
  font: 'var(--text-amount)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;

export const ehCaixa = (c: Conta) => c.tipo === 'DINHEIRO';

const iconeDaConta = (c: Conta): IconName =>
  ehCaixa(c) ? 'wallet' : c.titularidade === 'PESSOAL_DE_TERCEIRO' ? 'credit-card' : 'landmark';

const textoDaConciliacao = (c: Conta): string => {
  if (c.conciliacao === 'CONCILIADA') return 'Conciliada ontem';
  if (c.ultimoMovimento === null) return 'Nova conta';
  return ehCaixa(c) ? 'Contagem pendente' : 'A conferir';
};

const tomDaConciliacao = (c: Conta): BadgeTone => (c.conciliacao === 'CONCILIADA' ? 'confirmed' : 'pending');

const CORES_DE_RESERVA = [
  'var(--color-royal)',
  'var(--color-confirmed)',
  'var(--color-pending)',
  'var(--color-attention)',
];

export const corDaReserva = (indice: number) => CORES_DE_RESERVA[indice % CORES_DE_RESERVA.length] as string;

export function ContasEFundoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const [contas, setContas] = useState<readonly Conta[]>(contasIniciais);
  const [fundos, setFundos] = useState<readonly Fundo[]>(fundosIniciais);
  const [gerenciando, setGerenciando] = useState(false);
  const [aba, setAba] = useState<'contas' | 'fundo'>('contas');

  const contasAtivas = contas.filter((c) => c.ativa);
  const fundosAtivos = fundos.filter((f) => f.ativo);

  const emCaixa = contasAtivas.filter(ehCaixa).reduce((a, c) => a + c.saldo, 0);
  const emBanco = contasAtivas.filter((c) => !ehCaixa(c)).reduce((a, c) => a + c.saldo, 0);
  const comprometido = fundosAtivos.reduce((a, f) => a + f.valorReservado, 0);
  const livre = fundoProprio - comprometido;
  const pendentes = contasAtivas.filter((c) => c.conciliacao === 'PENDENTE').length;

  const reservas = [
    ...fundosAtivos.map((f, i) => ({
      chave: f.id,
      nome: f.nome,
      nota: f.nota,
      valor: f.valorReservado,
      cor: corDaReserva(i),
    })),
    {
      chave: 'livre',
      nome: 'Livre',
      nota: 'sem destino combinado',
      valor: livre,
      cor: 'var(--color-line-strong)',
    },
  ];

  const mostrarContas = !campo || aba === 'contas';
  const mostrarFundo = !campo || aba === 'fundo';

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-04' : 'F-04 · Contas e fundo'}
        title="Contas e fundo"
        subtitle={campo ? undefined : 'Saldo por conta e destino do fundo próprio · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 22px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 20,
          maxWidth: campo ? undefined : 1000,
        }}
      >
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

        {campo ? (
          <SeletorDeTipo
            opcoes={[
              { valor: 'contas', label: 'Contas' },
              { valor: 'fundo', label: 'Fundo' },
            ]}
            valor={aba}
            onEscolher={setAba}
            densidade={densidade}
          />
        ) : null}

        {mostrarContas ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              {campo ? null : <span style={rotuloLabel}>Contas</span>}
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {pluralizar(pendentes, 'conta esperando conferência', 'contas esperando conferência')}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="ghost" iconName="settings-2" onClick={() => setGerenciando(true)}>
                  Gerenciar contas e fundos
                </Button>
                {campo ? null : (
                  <Button variant="ghost" iconName="arrow-left-right">
                    Transferir entre contas
                  </Button>
                )}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              {contasAtivas.map((c) => (
                <CartaoDeConta key={c.id} conta={c} />
              ))}
            </div>
          </div>
        ) : null}

        {mostrarFundo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              {campo ? null : <span style={rotuloLabel}>Fundo próprio</span>}
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                reservado dentro do saldo, não é uma conta separada
              </span>
            </div>

            <div
              style={{
                background: 'var(--bg-card)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={rotuloLabel}>Total do fundo</span>
                  <span style={{ ...valorGrande, color: 'var(--color-royal-deep)' }}>
                    {formatarDinheiro(fundoProprio)}
                  </span>
                </div>
                <ColunaDoFundo rotulo="Já com destino" valor={comprometido} cor="var(--text-primary)" />
                <ColunaDoFundo rotulo="Livre" valor={livre} cor="var(--color-confirmed)" />
              </div>

              <div
                style={{
                  display: 'flex',
                  height: 12,
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                  background: 'var(--bg-sunken)',
                }}
              >
                {reservas.map((r) => (
                  <div
                    key={r.chave}
                    title={r.nome}
                    style={{ width: `${Math.max(0, (r.valor / fundoProprio) * 100)}%`, background: r.cor }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reservas.map((r) => (
                  <div key={r.chave} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 'var(--radius-pill)',
                        flex: '0 0 auto',
                        background: r.cor,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.nome}</span>
                      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{r.nota}</span>
                    </span>
                    <span style={{ ...valorMedio, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {formatarDinheiro(r.valor)}
                    </span>
                    <span style={{ width: 56, textAlign: 'right', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                      {Math.round((r.valor / fundoProprio) * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              <p
                style={{
                  font: 'var(--text-small)',
                  color: 'var(--text-secondary)',
                  borderTop: 'var(--border-hairline)',
                  paddingTop: 12,
                }}
              >
                O fundo não é uma conta: é uma parte do saldo que já tem destino combinado. Gastar de uma reserva não
                muda o saldo das contas, muda o que ainda está livre.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {gerenciando ? (
        <GerenciarContasModal
          contas={contas}
          fundos={fundos}
          onFechar={() => setGerenciando(false)}
          onSalvarConta={(conta) =>
            setContas((lista) =>
              lista.some((c) => c.id === conta.id) ? lista.map((c) => (c.id === conta.id ? conta : c)) : [...lista, conta],
            )
          }
          onSalvarFundo={(fundo) =>
            setFundos((lista) =>
              lista.some((f) => f.id === fundo.id) ? lista.map((f) => (f.id === fundo.id ? fundo : f)) : [...lista, fundo],
            )
          }
          onAlternarConta={(contaId: ContaId) =>
            setContas((lista) => lista.map((c) => (c.id === contaId ? { ...c, ativa: !c.ativa } : c)))
          }
          onAlternarFundo={(fundoId: FundoId) =>
            setFundos((lista) => lista.map((f) => (f.id === fundoId ? { ...f, ativo: !f.ativo } : f)))
          }
        />
      ) : null}
    </div>
  );
}

function BlocoDoResumo({ rotulo, valor, nota }: { rotulo: string; valor: number; nota: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        paddingLeft: 20,
        borderLeft: '1px solid var(--border-brand)',
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorGrande, color: 'var(--text-primary)' }}>{formatarDinheiro(valor)}</span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}

function ColunaDoFundo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 20, borderLeft: 'var(--border-hairline)' }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorMedio, color: cor }}>{formatarDinheiro(valor)}</span>
    </div>
  );
}

/** O cartão estica na altura da linha: o conteúdo se distribui, sem sobra embaixo. */
function CartaoDeConta({ conta }: { conta: Conta }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: `3px solid ${conta.conciliacao === 'PENDENTE' ? 'var(--color-pending)' : 'var(--color-confirmed)'}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 10,
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Icon name={iconeDaConta(conta)} size={18} color="var(--color-royal)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{conta.nome}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{conta.descricao}</span>
        </div>
        {conta.alerta ? (
          <span title={conta.alerta} style={{ cursor: 'help', display: 'flex', alignItems: 'center', paddingTop: 2 }}>
            <Icon name="triangle-alert" size={17} color="var(--color-attention)" />
          </span>
        ) : null}
        <StatusBadge tone={tomDaConciliacao(conta)}>{textoDaConciliacao(conta)}</StatusBadge>
      </div>

      <div style={{ ...valorGrande, color: 'var(--text-primary)' }}>{formatarDinheiro(conta.saldo)}</div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          font: 'var(--text-small)',
          color: 'var(--text-meta)',
        }}
      >
        <span>
          {conta.ultimoMovimento ? `movimento em ${formatarDiaMes(conta.ultimoMovimento)}` : 'sem movimentos ainda'}
        </span>
        <span>responsável: {conta.responsavel}</span>
      </div>
    </div>
  );
}

export const contaVazia = (id: ContaId): Conta => ({
  id,
  nome: '',
  descricao: '',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  responsavel: '',
  saldo: reais(0),
  ultimoMovimento: null,
  conciliacao: 'PENDENTE',
  alerta: null,
  ativa: true,
});

export const fundoVazio = (id: FundoId): Fundo => ({
  id,
  codigoSistema: '',
  nome: '',
  nota: '',
  contaVinculadaId: contasIniciais[0]?.id ?? ('cora' as ContaId),
  valorReservado: reais(0),
  meta: null,
  ativo: true,
});
