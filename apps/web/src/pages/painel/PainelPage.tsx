import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, ScreenHeader, type IconName } from '../../ds';
import { ROTAS } from '../../app/navegacao';
import { proximaCerimonia, ultimaCerimonia } from '../../mocks/cerimonias';
import {
  filaDeVerificacao,
  fundoProprio,
  movimentoDoMes,
  remessasEmLote,
  saldoConsolidado,
  saldoEmBanco,
  saldoEmCaixa,
} from '../../mocks/financeiro';
import { competenciaAtual, competenciaAnterior } from '../../mocks/sessao';
import {
  competenciaPorExtenso,
  formatarCompetencia,
  formatarDinheiro,
  formatarDiaMes,
  formatarLitros,
  pluralizar,
} from '../../lib/formato';
import { GraficoEstoque } from './GraficoEstoque';
import { GraficoResultado } from './GraficoResultado';
import { CartazSlot } from '../../components/CartazSlot';

const PAINEIS = ['Próxima cerimônia', 'Resultado por cerimônia', 'Última cerimônia'] as const;

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const numeroGrande = {
  font: 'var(--text-amount-lg)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;

export function PainelPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const irPara = (n: number) => setSlide((n + PAINEIS.length) % PAINEIS.length);

  return (
    <>
      <ScreenHeader
        code="T-02 · Painel"
        title="Painel"
        subtitle={`Competência ${formatarCompetencia(competenciaAtual)} · CDD — o que o dinheiro e as cerimônias estão fazendo agora.`}
      />

      <div
        style={{
          padding: '22px 24px 44px',
          maxWidth: 1220,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
          <div
            style={{
              flex: '1 1 300px',
              maxWidth: 336,
              minWidth: 0,
              background: 'var(--bg-brand)',
              border: '1px solid var(--border-brand)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="landmark" size={18} color="var(--color-royal-deep)" />
              <div style={rotuloLabel}>Saldo consolidado da unidade</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  font: 'var(--text-amount-hero)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--color-royal-deep)',
                }}
              >
                {formatarDinheiro(saldoConsolidado)}
              </div>
              <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                em reais · posição de hoje, 09:12
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border-brand)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LinhaDeSaldo rotulo="caixa" valor={saldoEmCaixa} />
              <LinhaDeSaldo rotulo="banco" valor={saldoEmBanco} />
              <LinhaDeSaldo rotulo="dos quais, fundo próprio" valor={fundoProprio} />
            </div>
          </div>

          <div
            style={{
              flex: '3 1 480px',
              minWidth: 0,
              background: 'var(--bg-card)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Icon name="chart-no-axes-column" size={18} color="var(--color-royal)" />
              <div style={rotuloLabel}>Movimento de {formatarCompetencia(competenciaAtual)}</div>
              <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                comparado com {formatarCompetencia(competenciaAnterior)}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 18 }}>
              <ColunaDeMovimento
                icone="arrow-down-left"
                cor="var(--color-confirmed)"
                rotulo="entradas"
                valor={movimentoDoMes.entradas}
                anterior={movimentoDoMes.entradasAnterior}
                comparacaoBoaQuandoSobe
              />
              <ColunaDeMovimento
                icone="arrow-up-right"
                cor="var(--color-attention)"
                rotulo="saídas"
                valor={movimentoDoMes.saidas}
                anterior={movimentoDoMes.saidasAnterior}
                divisor
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  paddingLeft: 18,
                  borderLeft: 'var(--border-hairline)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="scale" size={16} color="var(--color-royal)" />
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>resultado</span>
                </div>
                <div style={{ ...numeroGrande, color: 'var(--color-royal-deep)' }}>
                  + {formatarDinheiro(movimentoDoMes.resultado)}
                </div>
                <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  + {formatarDinheiro(movimentoDoMes.resultadoAnterior)} no mês anterior — o mês fecha melhor se nada
                  grande entrar até o fim de {competenciaPorExtenso(competenciaAtual).split(' ')[0]}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            background: 'var(--color-pending-soft)',
            border: '1px solid var(--color-pending-border)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
          }}
        >
          <Icon name="sparkles" size={20} color="var(--color-pending)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {filaDeVerificacao.length} lançamentos em lote aguardando verificação —{' '}
              {pluralizar(remessasEmLote, 'remessa')} de comprovantes
            </div>
            <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              A IA leu os comprovantes e propôs valor, data e categoria — uma pessoa precisa verificar antes de
              consolidar. Lançamento feito à mão já entra consolidado.
            </div>
          </div>
          <Button onClick={() => navigate(ROTAS.lote)}>Verificar lote</Button>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px 14px 20px',
              borderBottom: 'var(--border-hairline)',
            }}
          >
            <Icon name="calendar-days" size={18} color="var(--color-royal)" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PAINEIS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => irPara(i)}
                  aria-pressed={i === slide}
                  style={{
                    font: i === slide ? 'var(--text-body-strong)' : 'var(--text-body)',
                    padding: '10px 14px',
                    minHeight: 44,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    border: `1px solid ${i === slide ? 'var(--color-royal-border)' : 'transparent'}`,
                    background: i === slide ? 'var(--color-royal-soft)' : 'transparent',
                    color: i === slide ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{ font: 'var(--text-code)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-meta)' }}
              >
                {slide + 1} / {PAINEIS.length}
              </span>
              <SetaDoCarrossel rotulo="Painel anterior" icone="arrow-left" onClick={() => irPara(slide - 1)} />
              <SetaDoCarrossel rotulo="Próximo painel" icone="arrow-right" onClick={() => irPara(slide + 1)} />
            </div>
          </div>

          {slide === 0 ? <ResumoDaProxima /> : null}
          {slide === 1 ? <GraficoResultado /> : null}
          {slide === 2 ? <ResumoDaUltima /> : null}
        </div>

        <GraficoEstoque />
      </div>
    </>
  );
}

function LinhaDeSaldo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
      <span
        style={{
          font: 'var(--text-amount)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
        }}
      >
        {formatarDinheiro(valor)}
      </span>
    </div>
  );
}

function ColunaDeMovimento({
  icone,
  cor,
  rotulo,
  valor,
  anterior,
  divisor = false,
  comparacaoBoaQuandoSobe = false,
}: {
  icone: IconName;
  cor: string;
  rotulo: string;
  valor: number;
  anterior: number;
  divisor?: boolean;
  comparacaoBoaQuandoSobe?: boolean;
}) {
  const diferenca = valor - anterior;
  const acima = diferenca > 0;
  const corDaComparacao = comparacaoBoaQuandoSobe && acima ? 'var(--color-confirmed)' : 'var(--text-primary)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        paddingLeft: divisor ? 18 : undefined,
        borderLeft: divisor ? 'var(--border-hairline)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icone} size={16} color={cor} />
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{rotulo}</span>
      </div>
      <div style={{ ...numeroGrande, color: cor }}>{formatarDinheiro(valor)}</div>
      <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {formatarDinheiro(anterior)} no mês anterior —{' '}
        <span style={{ color: corDaComparacao, fontWeight: 600 }}>
          {formatarDinheiro(Math.abs(diferenca))} {acima ? 'acima' : 'abaixo'}
        </span>
      </div>
    </div>
  );
}

function SetaDoCarrossel({
  rotulo,
  icone,
  onClick,
}: {
  rotulo: string;
  icone: IconName;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        color: 'var(--color-royal)',
      }}
    >
      <Icon name={icone} size={18} color="var(--color-royal)" />
    </button>
  );
}

function BlocoDoResumo({
  icone,
  corDoIcone,
  rotulo,
  numero,
  corDoNumero,
  detalhe,
  destacado = false,
}: {
  icone: IconName;
  corDoIcone: string;
  rotulo: string;
  numero: number;
  corDoNumero: string;
  detalhe: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '12px 14px',
        background: destacado ? 'var(--bg-brand)' : 'var(--bg-card)',
        border: destacado ? '1px solid var(--border-brand)' : 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <span style={{ ...rotuloLabel, display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon name={icone} size={15} color={corDoIcone} />
        {rotulo}
      </span>
      <span style={{ ...numeroGrande, color: corDoNumero }}>{numero}</span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{detalhe}</span>
    </div>
  );
}

function ResumoDaProxima() {
  const c = proximaCerimonia;
  const vagasAbertas = c.capacidade - c.inscritos;

  return (
    <div style={{ padding: '18px 20px 22px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <CartazSlot largura={132} altura={178} />

      <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rotuloLabel}>Próxima cerimônia · em {pluralizar(c.emDias, 'dia')}</div>
          <h2
            style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}
          >
            {formatarDiaMes(c.data)} · {c.nome}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 2 }}>
            <ItemDeMeta icone="calendar-days">{c.horario}</ItemDeMeta>
            <ItemDeMeta icone="user-round">{c.dirigente}</ItemDeMeta>
            <ItemDeMeta icone="landmark">
              hospedagem {c.leitosOcupados} / {c.leitos} leitos
            </ItemDeMeta>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(158px,1fr))', gap: 16 }}>
          <BlocoDoResumo
            icone="users"
            corDoIcone="var(--color-royal-deep)"
            rotulo="Inscritos"
            numero={c.inscritos}
            corDoNumero="var(--color-royal-deep)"
            detalhe={`de ${c.capacidade} vagas — ${vagasAbertas} ainda abertas`}
            destacado
          />
          <BlocoDoResumo
            icone="receipt-text"
            corDoIcone="var(--color-pending)"
            rotulo="Sem pagamento"
            numero={c.semPagamento}
            corDoNumero="var(--color-pending)"
            detalhe={`${formatarDinheiro(c.aReceber)} a receber até ${formatarDiaMes(c.aReceberAte)}`}
          />
          <BlocoDoResumo
            icone="log-in"
            corDoIcone="var(--color-royal)"
            rotulo="Primeira vez"
            numero={c.primeiraVezNaCasa}
            corDoNumero="var(--color-royal-deep)"
            detalhe={
              <>
                na casa — <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.primeiraVezNaAyahuasca}</span>{' '}
                deles nunca tomaram ayahuasca
              </>
            }
          />
          <BlocoDoResumo
            icone="message-circle-question"
            corDoIcone="var(--color-pending)"
            rotulo="Anamnese"
            numero={c.anamnesePendente}
            corDoNumero="var(--color-pending)"
            detalhe={`ainda não responderam — ${c.anamneseEntregue} de ${c.inscritos} entregues`}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '14px 16px',
            background: 'var(--color-attention-soft)',
            border: '1px solid var(--color-attention-border)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9 }}>
            <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {pluralizar(c.pontosDeAtencao.length, 'ponto')} de atenção em medicação ou saúde
            </span>
          </div>
          {c.pontosDeAtencao.map((a) => (
            <div
              key={a.nome}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'baseline',
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{a.nome}</span>
              <span>{a.nota}</span>
            </div>
          ))}
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Quem cuida da recepção precisa falar com essas {c.pontosDeAtencao.length} pessoas antes da abertura.
          </span>
        </div>
      </div>
    </div>
  );
}

function ResumoDaUltima() {
  const u = ultimaCerimonia;

  return (
    <div style={{ padding: '18px 20px 22px', display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <CartazSlot largura={132} altura={178} />

      <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={rotuloLabel}>Última cerimônia</div>
          <h2
            style={{ font: 'var(--text-title)', letterSpacing: 'var(--tracking-display)', color: 'var(--text-title)' }}
          >
            {formatarDiaMes(u.data)} · {u.nome}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 2 }}>
            <ItemDeMeta icone="users">{pluralizar(u.participantes, 'participante')}</ItemDeMeta>
            <ItemDeMeta icone="check-check" cor="var(--color-confirmed)">
              contas fechadas em {formatarDiaMes(u.contasFechadasEm)}
            </ItemDeMeta>
            <ItemDeMeta icone="user-round">{u.dirigente}</ItemDeMeta>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 18 }}>
          <ValorDaUltima rotulo="Contribuições" valor={u.contribuicoes} cor="var(--color-confirmed)" />
          <ValorDaUltima rotulo="Custos" valor={u.custos} cor="var(--color-attention)" divisor />
          <ValorDaUltima rotulo="Resultado" valor={u.resultado} cor="var(--color-royal-deep)" sinal divisor />
        </div>

        <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Média de {formatarDinheiro(u.mediaPorParticipante)} por participante — {formatarLitros(u.litrosServidos)} L de
          ayahuasca servidos, dentro do consumo habitual.
        </div>
      </div>
    </div>
  );
}

function ValorDaUltima({
  rotulo,
  valor,
  cor,
  sinal = false,
  divisor = false,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  sinal?: boolean;
  divisor?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingLeft: divisor ? 18 : undefined,
        borderLeft: divisor ? 'var(--border-hairline)' : undefined,
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...numeroGrande, color: cor }}>
        {sinal ? '+ ' : ''}
        {formatarDinheiro(valor)}
      </span>
    </div>
  );
}

function ItemDeMeta({
  icone,
  cor = 'var(--text-meta)',
  children,
}: {
  icone: IconName;
  cor?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--text-small)',
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name={icone} size={14} color={cor} />
      {children}
    </span>
  );
}
