import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, ScreenHeader, StatusBadge, type BadgeTone, type IconName } from '../../ds';
import { ROTAS, type RotaId } from '../../app/navegacao';
import { useDensidade } from '../../lib/useDensidade';
import { competenciaPorExtenso, formatarCompetencia, formatarDinheiro, pluralizar } from '../../lib/formato';
import { contas } from '../../mocks/financeiro';
import { lancamentos } from '../../mocks/lancamentos';
import { filaDeVerificacaoInicial } from '../../mocks/verificacao';
import { competenciaAtual } from '../../mocks/sessao';

interface ItemDoChecklist {
  id: string;
  titulo: string;
  detalhe: string;
  /** Item que trava o fechamento; o resto é aviso que fica registrado. */
  bloqueia: boolean;
  ok: boolean;
  acao: { rotulo: string; rota: RotaId } | null;
}

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

const HISTORICO = [
  { periodo: 'Julho de 2026', meta: 'fechado por Aurio Neto em 03/08 · reaberto uma vez', resultado: 418022 },
  { periodo: 'Junho de 2026', meta: 'fechado por Lucia Prado em 02/07', resultado: 290510 },
  { periodo: 'Maio de 2026', meta: 'fechado por Aurio Neto em 04/06', resultado: -124480 },
  { periodo: 'Abril de 2026', meta: 'fechado por Aurio Neto em 05/05', resultado: 651245 },
];

export function FechamentoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const navigate = useNavigate();
  const [fechado, setFechado] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [mensagem, setMensagem] = useState<string | null>(null);

  const naFila = filaDeVerificacaoInicial.length;
  const contasAtivas = contas.filter((c) => c.ativa);
  const semConciliacao = contasAtivas.filter((c) => c.conciliacao === 'PENDENTE');
  const caixa = contasAtivas.find((c) => c.tipo === 'DINHEIRO');
  const caixaContado = caixa?.alerta === null;
  const doMes = lancamentos.filter((l) => l.competencia === competenciaAtual);
  const semComprovante = doMes.filter((l) => l.comprovante === null);
  const transferenciasDoMes = doMes.filter((l) => l.tipo === 'TRANSFERENCIA');

  const checklist: readonly ItemDoChecklist[] = [
    {
      id: 'fila',
      titulo: 'Fila de verificação zerada',
      bloqueia: true,
      ok: naFila === 0,
      detalhe: naFila === 0 ? 'nada pendente na fila' : `${pluralizar(naFila, 'lançamento')} ainda esperando conferência`,
      acao: { rotulo: 'Ir para a fila', rota: 'lote' },
    },
    {
      id: 'conciliacao',
      titulo: 'Contas conciliadas com o extrato',
      bloqueia: true,
      ok: semConciliacao.length === 0,
      detalhe:
        semConciliacao.length === 0
          ? `${pluralizar(contasAtivas.length, 'conta conciliada', 'contas conciliadas')} em 31/08`
          : `${semConciliacao.map((c) => c.nome).join(' e ')} sem conciliação de agosto`,
      acao: { rotulo: 'Abrir contas', rota: 'contas' },
    },
    {
      id: 'contagem',
      titulo: 'Contagem do caixa em espécie',
      bloqueia: true,
      ok: caixaContado,
      detalhe: caixaContado
        ? `contada por ${caixa?.responsavel ?? 'quem cuida do caixa'}, sem diferença`
        : 'última contagem foi em 31/07',
      acao: { rotulo: 'Registrar contagem', rota: 'contas' },
    },
    {
      id: 'comprovantes',
      titulo: 'Comprovantes anexados',
      bloqueia: false,
      ok: semComprovante.length === 0,
      detalhe: `${pluralizar(semComprovante.length, 'lançamento')} sem anexo — não impede o fechamento, mas fica registrado assim`,
      acao: { rotulo: 'Ver lançamentos', rota: 'lancamentos' },
    },
    {
      id: 'transferencias',
      titulo: 'Transferências com os dois lados',
      bloqueia: true,
      ok: true,
      detalhe: `${pluralizar(transferenciasDoMes.length, 'transferência do mês bate', 'transferências do mês batem')} origem e destino`,
      acao: null,
    },
  ];

  const bloqueios = checklist.filter((i) => i.bloqueia && !i.ok);
  const avisos = checklist.filter((i) => !i.bloqueia && !i.ok);

  const entradas = doMes.filter((l) => l.tipo === 'ENTRADA').reduce((a, l) => a + l.valor, 0);
  const saidas = doMes.filter((l) => l.tipo === 'SAIDA' && l.status !== 'ESTORNADO').reduce((a, l) => a + l.valor, 0);
  const resultado = entradas - saidas;
  const totalSaldos = contasAtivas.reduce((a, c) => a + c.saldo, 0);

  const corDoStatus = fechado
    ? 'var(--color-confirmed)'
    : bloqueios.length
      ? 'var(--color-pending)'
      : 'var(--color-royal-deep)';

  const fechar = () => {
    if (bloqueios.length) return;
    setFechado(true);
    setMensagem(
      `${competenciaPorExtenso(competenciaAtual)} fechado. Novos lançamentos no período só depois de reabrir.`,
    );
  };

  const confirmarReabertura = () => {
    if (!motivo.trim()) return;
    setFechado(false);
    setReabrindo(false);
    setMensagem(`Agosto reaberto por Aurio Neto. O motivo ficou no histórico do período: ${motivo.trim()}`);
    setMotivo('');
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-07' : 'F-07 · Fechamento'}
        title="Fechamento"
        subtitle={campo ? undefined : 'Confere o que falta, registra o saldo e trava o período · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 18,
          maxWidth: campo ? undefined : 1000,
        }}
      >
        {mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{mensagem}</span>
            <button type="button" aria-label="fechar aviso" onClick={() => setMensagem(null)} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <div
          style={{
            background: fechado ? 'var(--bg-card)' : 'var(--bg-brand)',
            border: `1px solid ${fechado ? 'var(--color-confirmed)' : 'var(--border-brand)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: campo ? '14px 16px' : '18px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: campo ? 14 : 22,
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 260px' }}>
            <span style={rotuloLabel}>Competência {formatarCompetencia(competenciaAtual)} · CDD</span>
            <span style={{ font: 'var(--text-title-sm)', color: corDoStatus }}>
              {fechado
                ? 'Fechado'
                : bloqueios.length
                  ? `Aberto, com ${pluralizar(bloqueios.length, 'pendência', 'pendências')}`
                  : 'Pronto para fechar'}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {fechado
                ? 'Fechado por Aurio Neto em 01/09/2026, 09:20. Lançamentos com data de agosto ficam bloqueados.'
                : bloqueios.length
                  ? 'Resolva as pendências abaixo para liberar o fechamento.'
                  : 'Nada bloqueia o fechamento. Depois de fechado, correção só reabrindo o período.'}
            </span>
          </div>

          <ColunaDeResumo rotulo="Entradas" valor={entradas} cor="var(--color-confirmed)" />
          <ColunaDeResumo rotulo="Saídas" valor={saidas} cor="var(--color-attention)" divisor />
          <ColunaDeResumo rotulo="Resultado" valor={resultado} cor="var(--color-royal-deep)" divisor />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={rotuloLabel}>O que o fechamento exige</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {bloqueios.length === 0
                ? avisos.length
                  ? `tudo resolvido · ${pluralizar(avisos.length, 'aviso que não bloqueia', 'avisos que não bloqueiam')}`
                  : 'tudo resolvido'
                : `${pluralizar(bloqueios.length, 'item bloqueia', 'itens bloqueiam')} o fechamento`}
            </span>
          </div>

          {checklist.map((i) => {
            const estado = i.ok ? 'ok' : i.bloqueia ? 'bloqueia' : 'aviso';
            const cor =
              estado === 'ok'
                ? 'var(--color-confirmed)'
                : estado === 'bloqueia'
                  ? 'var(--color-pending)'
                  : 'var(--color-attention)';
            const icone: IconName =
              estado === 'ok' ? 'circle-check' : estado === 'bloqueia' ? 'circle-alert' : 'triangle-alert';
            const tone: BadgeTone = estado === 'ok' ? 'confirmed' : estado === 'bloqueia' ? 'pending' : 'suggest';

            return (
              <div
                key={i.id}
                style={{
                  display: 'flex',
                  flexDirection: campo ? 'column' : 'row',
                  alignItems: campo ? 'flex-start' : 'center',
                  gap: campo ? 5 : 12,
                  padding: campo ? '11px 12px' : '12px 14px',
                  border: 'var(--border-hairline)',
                  borderLeft: `3px solid ${cor}`,
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-card)',
                }}
              >
                <Icon name={icone} size={18} color={cor} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{i.titulo}</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{i.detalhe}</span>
                </div>
                <StatusBadge tone={tone}>
                  {estado === 'ok' ? 'Resolvido' : estado === 'bloqueia' ? 'Bloqueia' : 'Só aviso'}
                </StatusBadge>
                {i.acao && !i.ok ? (
                  <Button variant="ghost" onClick={() => navigate(ROTAS[i.acao!.rota])}>
                    {i.acao.rotulo}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span style={rotuloLabel}>Saldo por conta que fica registrado no fechamento</span>
          {contasAtivas.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{c.nome}</span>
              <span
                style={{
                  font: 'var(--text-amount)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--text-primary)',
                }}
              >
                {formatarDinheiro(c.saldo)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              borderTop: 'var(--border-hairline)',
              paddingTop: 10,
            }}
          >
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Total</span>
            <span style={{ ...valorGrande, color: 'var(--color-royal-deep)' }}>{formatarDinheiro(totalSaldos)}</span>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
            {fechado ? 'Período fechado' : bloqueios.length ? 'Fechamento bloqueado' : 'Tudo pronto'}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {fechado
              ? 'A ata guarda os saldos, o resultado e quem assinou o fechamento.'
              : bloqueios.length
                ? bloqueios.map((b) => b.titulo).join(' · ')
                : 'Ao fechar, os saldos acima viram o registro oficial de agosto.'}
          </span>

          {fechado ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Button
                variant="ghost"
                iconName="file-down"
                onClick={() => setMensagem('Ata de fechamento de agosto de 2026 gerada em PDF.')}
              >
                Ata em PDF
              </Button>
              <Button variant="quiet" iconName="lock-open" onClick={() => setReabrindo(true)}>
                Reabrir período
              </Button>
            </div>
          ) : (
            <Button
              density={densidade}
              fullWidth={campo}
              iconName="lock"
              disabled={bloqueios.length > 0}
              blockedReason={
                bloqueios.length
                  ? `Resolva ${pluralizar(bloqueios.length, 'pendência', 'pendências')} antes de fechar.`
                  : undefined
              }
              onClick={fechar}
              style={{ alignSelf: campo ? 'stretch' : 'flex-start' }}
            >
              Fechar {competenciaPorExtenso(competenciaAtual)}
            </Button>
          )}

          {reabrindo ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: 'var(--color-pending-soft)',
                border: '1px solid var(--color-pending-border)',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
              }}
            >
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                Por que este período precisa ser reaberto?
              </span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                aria-label="Motivo da reabertura"
                placeholder="o motivo fica no histórico do período, de forma permanente"
                style={{
                  border: '1px solid var(--color-line-strong)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  font: 'var(--text-body)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Button
                  iconName="lock-open"
                  disabled={!motivo.trim()}
                  blockedReason={!motivo.trim() ? 'Sem motivo, a reabertura não é registrável.' : undefined}
                  onClick={confirmarReabertura}
                >
                  Reabrir
                </Button>
                <Button variant="quiet" onClick={() => setReabrindo(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={rotuloLabel}>Meses anteriores</span>
          {HISTORICO.map((h) => (
            <div
              key={h.periodo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                padding: '11px 14px',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{h.periodo}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{h.meta}</span>
              </div>
              <StatusBadge tone="confirmed">Fechado</StatusBadge>
              <span
                style={{
                  font: 'var(--text-amount)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: h.resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
                }}
              >
                {h.resultado >= 0 ? '+ ' : '− '}
                {formatarDinheiro(Math.abs(h.resultado))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ColunaDeResumo({
  rotulo,
  valor,
  cor,
  divisor = false,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  divisor?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0,
        paddingLeft: divisor ? 20 : undefined,
        borderLeft: divisor ? '1px solid var(--border-brand)' : undefined,
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorGrande, color: cor }}>{formatarDinheiro(valor)}</span>
    </div>
  );
}
