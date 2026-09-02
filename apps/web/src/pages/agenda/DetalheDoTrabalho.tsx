import { Button, Icon, StatusBadge, type BadgeTone } from '../../ds';
import { Interruptor } from '../../components/Campo';
import { CartazSlot } from '../../components/CartazSlot';
import { formatarValor } from '../../lib/formato';
import {
  CORES_POR_TIPO,
  VERSAO_DO_FORMULARIO,
  participantesDe,
  type EstadoDaAnamnese,
  type Trabalho,
} from '../../mocks/agenda';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ORIGENS_DE_MARCACAO = [
  'marcado pelo link, hoje 14:02',
  'marcado por webhook, ontem 18:40',
  'marcado no sistema por Lucia Prado',
];

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const TOM_DA_ANAMNESE: Record<EstadoDaAnamnese, BadgeTone> = {
  'em dia': 'confirmed',
  vencida: 'suggest',
  ausente: 'pending',
};

const TEXTO_DA_ANAMNESE: Record<EstadoDaAnamnese, string> = {
  'em dia': 'Anamnese em dia',
  vencida: 'Anamnese vencida',
  ausente: 'Sem anamnese',
};

export interface DetalheDoTrabalhoProps {
  trabalho: Trabalho;
  feitos: Readonly<Record<string, boolean>>;
  webhookAtivo: boolean;
  campo: boolean;
  onVoltar: () => void;
  onAlternarTarefa: (indice: number) => void;
  onAlternarWebhook: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onCancelar: () => void;
  onAviso: (texto: string) => void;
}

export function DetalheDoTrabalho({
  trabalho: ev,
  feitos,
  webhookAtivo,
  campo,
  onVoltar,
  onAlternarTarefa,
  onAlternarWebhook,
  onEditar,
  onDuplicar,
  onCancelar,
  onAviso,
}: DetalheDoTrabalhoProps) {
  const participantes = participantesDe(ev);
  const confirmados = participantes.filter((p) => p.situacao === 'confirmado');
  const emEspera = participantes.filter((p) => p.situacao === 'espera');
  const visitantes = participantes.filter((p) => p.vinculo === 'Visitante');
  const semAnamnese = participantes.filter((p) => p.anamnese === 'ausente');
  const vencidas = participantes.filter((p) => p.anamnese === 'vencida');
  const emDia = participantes.filter((p) => p.anamnese === 'em dia');
  const comAtencao = participantes.filter((p) => p.atencao);

  const prontas = ev.preparo.filter((_, i) => feitos[`${ev.id}:${i}`]).length;
  const linkDoPreparo = `cdd.app/preparo/${ev.id}-${String(ev.dia).padStart(2, '0')}${MESES_CURTOS[ev.mes - 1]}`;
  const cancelada = ev.situacao === 'cancelada';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 14 : 18 }}>
      <button
        type="button"
        onClick={onVoltar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          font: 'var(--text-small)',
          color: 'var(--color-royal)',
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="arrow-left" size={16} color="var(--color-royal)" />
        Voltar para a agenda
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <CartazSlot largura={132} altura={178} />

        <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                font: '600 12px var(--font-body)',
                color: '#fff',
                background: CORES_POR_TIPO[ev.tipo],
                borderRadius: 'var(--radius-pill)',
                padding: '4px 11px',
              }}
            >
              {ev.tipo}
            </span>
            <StatusBadge
              tone={
                ev.situacao === 'realizada'
                  ? 'confirmed'
                  : ev.situacao === 'cancelada'
                    ? 'neutral'
                    : ev.situacao === 'confirmada'
                      ? 'royal'
                      : 'pending'
              }
            >
              {ev.situacao[0]?.toUpperCase()}
              {ev.situacao.slice(1)}
            </StatusBadge>
          </div>

          <h2
            style={{
              font: 'var(--text-display)',
              letterSpacing: 'var(--tracking-display)',
              color: 'var(--text-title)',
              textDecoration: cancelada ? 'line-through' : 'none',
            }}
          >
            {String(ev.dia).padStart(2, '0')}/{String(ev.mes).padStart(2, '0')} · {ev.nome}
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <Meta icone="calendar-days">{ev.horario}</Meta>
            <Meta icone="landmark">{ev.local}</Meta>
            <Meta icone="user-round">{ev.dirigente}</Meta>
            {ev.litros > 0 ? <Meta icone="flask-conical">{ev.litros} L previstos</Meta> : null}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Button variant="ghost" iconName="pencil" onClick={onEditar}>
              Editar
            </Button>
            <Button variant="quiet" iconName="copy" onClick={onDuplicar}>
              Duplicar
            </Button>
            <Button
              variant="quiet"
              iconName="circle-x"
              disabled={cancelada}
              blockedReason={cancelada ? 'Esta cerimônia já está cancelada.' : undefined}
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 12,
        }}
      >
        <Numero rotulo="Confirmados" valor={`${confirmados.length}`} nota={`de ${ev.previstos} previstos`} />
        <Numero rotulo="Visitantes" valor={`${visitantes.length}`} nota="primeira vez ou convidados" />
        <Numero rotulo="Litros previstos" valor={`${ev.litros}`} nota="reserva no estoque" />
        <Numero
          rotulo="Contribuição"
          valor={ev.contribuicoes.length ? ev.contribuicoes.map((c) => formatarValor(c).replace(',00', '')).join(' · ') : '—'}
          nota={ev.contribuicoes.length > 1 ? 'opções sugeridas' : 'sem contribuição'}
        />
      </div>

      <Bloco titulo="Quem conduz">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {ev.equipe.map(([funcao, quem]) => (
            <div key={funcao} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={rotuloLabel}>{funcao}</span>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{quem}</span>
            </div>
          ))}
        </div>
      </Bloco>

      <Bloco
        titulo="Lista de preparo"
        nota={ev.preparo.length ? `${prontas} de ${ev.preparo.length} prontos` : 'sem tarefas'}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ev.preparo.map((t, i) => {
            const feita = !!feitos[`${ev.id}:${i}`];
            return (
              <label
                key={t.titulo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: 'var(--border-hairline)',
                  borderRadius: 'var(--radius)',
                  background: feita ? 'var(--color-confirmed-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={feita}
                  onChange={() => onAlternarTarefa(i)}
                  style={{ width: 17, height: 17, cursor: 'pointer' }}
                />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span
                    style={{
                      font: 'var(--text-body)',
                      color: 'var(--text-primary)',
                      textDecoration: feita ? 'line-through' : 'none',
                    }}
                  >
                    {t.titulo}
                  </span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                    {t.responsavel}
                    {feita ? ` · ${ORIGENS_DE_MARCACAO[i % ORIGENS_DE_MARCACAO.length]}` : ''}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            borderTop: 'var(--border-hairline)',
            paddingTop: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 0 }}>
            <Icon name="link" size={16} color="var(--color-royal)" />
            <code
              style={{
                font: 'var(--text-code)',
                color: 'var(--color-royal-ink)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {linkDoPreparo}
            </code>
            <Button
              variant="quiet"
              iconName="copy"
              onClick={() => onAviso('Link do preparo copiado. Quem abrir marca as tarefas sem precisar de login.')}
            >
              Copiar
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'right' }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>Webhook</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                {webhookAtivo ? 'POST /preparo/{id}/tarefas · última atualização hoje, 14:02' : 'desligado'}
              </span>
            </span>
            <Interruptor
              ligado={webhookAtivo}
              onAlternar={onAlternarWebhook}
              rotuloAcessivel="Atualização do preparo por webhook"
            />
          </div>
        </div>
      </Bloco>

      <Bloco
        titulo="Anamnese do trabalho"
        nota={
          semAnamnese.length === 0 && vencidas.length === 0
            ? 'todos com anamnese em dia'
            : `${semAnamnese.length} sem resposta · ${vencidas.length} vencidas`
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
          <Numero rotulo="Em dia" valor={`${emDia.length}`} cor="var(--color-confirmed)" />
          <Numero rotulo="Vencidas" valor={`${vencidas.length}`} cor="var(--color-suggest)" />
          <Numero rotulo="Sem resposta" valor={`${semAnamnese.length}`} cor="var(--color-pending)" />
          <Numero rotulo="Pontos de atenção" valor={`${comAtencao.length}`} cor="var(--color-attention)" />
        </div>

        {comAtencao.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'var(--color-attention-soft)',
              border: '1px solid var(--color-attention-border)',
              borderRadius: 'var(--radius)',
              padding: '12px 14px',
            }}
          >
            {comAtencao.slice(0, 5).map((p) => (
              <div key={p.nome} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{p.nome}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>— {p.atencao}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            borderTop: 'var(--border-hairline)',
            paddingTop: 12,
          }}
        >
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>
            Formulário em uso: versão {VERSAO_DO_FORMULARIO}, publicada em 12/06/2026.
          </span>
          <Button
            variant="ghost"
            iconName="send"
            onClick={() => onAviso('Convite de anamnese enviado a quem está sem resposta ou com resposta vencida.')}
          >
            Cobrar quem está pendente
          </Button>
        </div>
      </Bloco>

      <Bloco
        titulo="Participantes"
        nota={`${confirmados.length} confirmados · ${emEspera.length} em espera · ${visitantes.length} visitantes${
          participantes.length > 12 ? ` · mostrando 12 de ${participantes.length}` : ''
        }`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {participantes.slice(0, 12).map((p) => (
            <button
              key={p.nome}
              type="button"
              onClick={() => onAviso(`Ficha de ${p.nome} — cadastro e anamneses ficam na tela Pessoas.`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                padding: '10px 12px',
                border: 'var(--border-hairline)',
                borderLeft: `3px solid ${p.situacao === 'confirmado' ? 'var(--color-confirmed)' : 'var(--color-pending)'}`,
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.nome}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{p.contato}</span>
              </span>
              {p.atencao ? (
                <span title={p.atencao} style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                  <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
                </span>
              ) : null}
              <StatusBadge tone={TOM_DA_ANAMNESE[p.anamnese]}>{TEXTO_DA_ANAMNESE[p.anamnese]}</StatusBadge>
              <StatusBadge tone={p.situacao === 'confirmado' ? 'royal' : 'pending'}>
                {p.situacao === 'confirmado' ? 'Confirmado' : 'Em espera'}
              </StatusBadge>
              {p.contribuicao ? (
                <span
                  style={{
                    font: 'var(--text-amount)',
                    letterSpacing: 'var(--tracking-amount)',
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatarValor(p.contribuicao)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Dinheiro da cerimônia">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14 }}>
          <Numero rotulo="Custo previsto" valor={formatarValor(ev.previstoGasto)} />
          <Numero rotulo="Custo lançado" valor={formatarValor(ev.realizadoGasto)} cor="var(--color-attention)" />
          <Numero
            rotulo="Contribuições esperadas"
            valor={formatarValor(
              participantes.filter((p) => p.situacao === 'confirmado').reduce((a, p) => a + p.contribuicao, 0),
            )}
          />
          <Numero rotulo="Contribuições recebidas" valor={formatarValor(ev.arrecadado)} cor="var(--color-confirmed)" />
        </div>
        <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          O bloco vem dos lançamentos com esta cerimônia vinculada — o mesmo campo do registro.
        </p>
      </Bloco>

      {ev.observacoes ? (
        <Bloco titulo="Observações">
          <p style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>{ev.observacoes}</p>
        </Bloco>
      ) : null}
    </div>
  );
}

function Bloco({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      </div>
      {children}
    </div>
  );
}

function Numero({
  rotulo,
  valor,
  nota,
  cor = 'var(--color-royal-deep)',
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  cor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '11px 13px',
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <span style={rotuloLabel}>{rotulo}</span>
      <span
        style={{
          font: 'var(--text-amount-lg)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: cor,
        }}
      >
        {valor}
      </span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
    </div>
  );
}

function Meta({ icone, children }: { icone: 'calendar-days' | 'landmark' | 'user-round' | 'flask-conical'; children: React.ReactNode }) {
  return (
    <span
      style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--text-small)', color: 'var(--text-secondary)' }}
    >
      <Icon name={icone} size={14} color="var(--text-meta)" />
      {children}
    </span>
  );
}
