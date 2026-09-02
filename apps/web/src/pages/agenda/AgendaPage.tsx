import { useState } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, type BadgeTone } from '../../ds';
import { SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { nomeDoMes, pluralizar } from '../../lib/formato';
import {
  CORES_POR_TIPO,
  trabalhosIniciais,
  type SituacaoDoTrabalho,
  type Trabalho,
} from '../../mocks/agenda';
import { CalendarioMensal, LegendaDeTipos } from './CalendarioMensal';
import { DetalheDoTrabalho } from './DetalheDoTrabalho';
import { FormularioDeTrabalho, rascunhoDe, rascunhoVazio, type RascunhoDeTrabalho } from './FormularioDeTrabalho';

const TOM_DA_SITUACAO: Record<SituacaoDoTrabalho, BadgeTone> = {
  planejada: 'pending',
  confirmada: 'royal',
  realizada: 'confirmed',
  cancelada: 'neutral',
};

const rotuloDaSituacao = (s: SituacaoDoTrabalho) => s[0]!.toUpperCase() + s.slice(1);

export function AgendaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [trabalhos, setTrabalhos] = useState<readonly Trabalho[]>(trabalhosIniciais);
  const [vista, setVista] = useState<'calendario' | 'lista'>('calendario');
  const [ano, setAno] = useState(2026);
  const [mes, setMes] = useState(9);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<RascunhoDeTrabalho | null>(null);
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});
  const [webhookAtivo, setWebhookAtivo] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const emDetalhe = trabalhos.find((t) => t.id === detalheId) ?? null;
  const doMes = trabalhos.filter((t) => t.ano === ano && t.mes === mes);
  const ordenados = [...trabalhos].sort((a, b) => a.ano - b.ano || a.mes - b.mes || a.dia - b.dia);

  const navegarMes = (delta: number) => {
    const i = ano * 12 + (mes - 1) + delta;
    setAno(Math.floor(i / 12));
    setMes((i % 12) + 1);
  };

  const salvar = (f: RascunhoDeTrabalho) => {
    const [dia, mesForm, anoForm] = f.data.split('/').map((n) => parseInt(n, 10));
    const contribuicoes = f.contribuicoes
      .split(',')
      .map((v) => parseFloat(v.replace(',', '.').trim()))
      .filter((v) => !Number.isNaN(v));

    const base = {
      nome: f.nome,
      tipo: f.tipo,
      dia: dia || 1,
      mes: mesForm || mes,
      ano: anoForm || ano,
      horario: f.horario,
      local: f.local,
      dirigente: f.dirigente || 'a definir',
      previstos: parseInt(f.previstos, 10) || 0,
      litros: parseFloat(f.litros.replace(',', '.')) || 0,
      contribuicoes,
      observacoes: f.observacoes,
      preparo: f.preparo
        .filter((t) => t.titulo.trim())
        .map((t) => ({ titulo: t.titulo.trim(), responsavel: t.responsavel.trim() || 'a definir' })),
    };

    if (f.editId != null) {
      setTrabalhos((lista) => lista.map((t) => (t.id === f.editId ? { ...t, ...base } : t)));
      setMensagem('Cerimônia atualizada.');
    } else {
      const novo: Trabalho = {
        id: Date.now(),
        ...base,
        confirmados: 0,
        visitantes: 0,
        situacao: 'planejada',
        equipe: [['Dirigente', base.dirigente]],
        previstoGasto: 0,
        realizadoGasto: 0,
        arrecadado: 0,
      };
      setTrabalhos((lista) => [...lista, novo]);
      setMes(novo.mes);
      setAno(novo.ano);
      setMensagem('Cerimônia criada como planejada.');
    }
    setForm(null);
  };

  const duplicar = () => {
    if (!emDetalhe) return;
    const novo: Trabalho = {
      ...emDetalhe,
      id: Date.now(),
      situacao: 'planejada',
      confirmados: 0,
      realizadoGasto: 0,
      arrecadado: 0,
    };
    setTrabalhos((lista) => [...lista, novo]);
    setDetalheId(novo.id);
    setMensagem('Cerimônia duplicada como planejada — ajuste a data.');
  };

  const cancelar = () => {
    if (!emDetalhe) return;
    setTrabalhos((lista) => lista.map((t) => (t.id === emDetalhe.id ? { ...t, situacao: 'cancelada' } : t)));
    setMensagem('Cerimônia marcada como cancelada. Ela continua no histórico.');
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-01' : 'E-01 · Agenda'}
        title={emDetalhe ? 'Cerimônia' : 'Agenda'}
        subtitle={
          emDetalhe
            ? undefined
            : campo
              ? undefined
              : 'Os trabalhos do centro, no calendário ou em lista · CDD'
        }
        density={densidade}
        actions={
          emDetalhe ? undefined : (
            <Button iconName="circle-plus" onClick={() => setForm(rascunhoVazio())}>
              Nova cerimônia
            </Button>
          )
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          maxWidth: campo ? undefined : 1080,
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

        {emDetalhe ? (
          <DetalheDoTrabalho
            trabalho={emDetalhe}
            feitos={feitos}
            webhookAtivo={webhookAtivo}
            campo={campo}
            onVoltar={() => setDetalheId(null)}
            onAlternarTarefa={(i) =>
              setFeitos((f) => ({ ...f, [`${emDetalhe.id}:${i}`]: !f[`${emDetalhe.id}:${i}`] }))
            }
            onAlternarWebhook={() => {
              setWebhookAtivo((a) => !a);
              setMensagem(
                webhookAtivo
                  ? 'Webhook desligado — a lista só muda por aqui e pelo link.'
                  : 'Webhook ligado: POST /preparo/{id}/tarefas atualiza a lista.',
              );
            }}
            onEditar={() => setForm(rascunhoDe(emDetalhe))}
            onDuplicar={duplicar}
            onCancelar={cancelar}
            onAviso={setMensagem}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <SeletorDeTipo
                opcoes={[
                  { valor: 'calendario', label: 'Calendário' },
                  { valor: 'lista', label: 'Lista' },
                ]}
                valor={vista}
                onEscolher={setVista}
                densidade={densidade}
              />

              {vista === 'calendario' ? (
                <div style={{ marginLeft: campo ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() => navegarMes(-1)}
                    style={setaDoMes}
                  >
                    <Icon name="arrow-left" size={16} color="var(--color-royal)" />
                  </button>
                  <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', minWidth: 150, textAlign: 'center' }}>
                    {nomeDoMes(mes - 1)} de {ano}
                  </span>
                  <button type="button" aria-label="Próximo mês" onClick={() => navegarMes(1)} style={setaDoMes}>
                    <Icon name="arrow-right" size={16} color="var(--color-royal)" />
                  </button>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {doMes.length === 0 ? 'nenhuma cerimônia' : pluralizar(doMes.length, 'cerimônia no mês', 'cerimônias no mês')}
                  </span>
                </div>
              ) : null}
            </div>

            {vista === 'calendario' ? (
              <>
                <CalendarioMensal ano={ano} mes={mes} trabalhos={trabalhos} onAbrir={setDetalheId} />
                <LegendaDeTipos />
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ordenados.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDetalheId(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                      padding: '12px 14px',
                      border: 'var(--border-hairline)',
                      borderLeft: `3px solid ${CORES_POR_TIPO[t.tipo]}`,
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span
                      style={{
                        font: 'var(--text-code)',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--text-meta)',
                        flex: '0 0 auto',
                      }}
                    >
                      {String(t.dia).padStart(2, '0')}/{String(t.mes).padStart(2, '0')}
                    </span>
                    <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          font: 'var(--text-body-strong)',
                          color: 'var(--text-primary)',
                          textDecoration: t.situacao === 'cancelada' ? 'line-through' : 'none',
                        }}
                      >
                        {t.nome}
                      </span>
                      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                        {t.horario} · {t.local} · {t.dirigente}
                      </span>
                    </span>
                    {t.litros > 0 ? (
                      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{t.litros} L</span>
                    ) : null}
                    <StatusBadge tone={TOM_DA_SITUACAO[t.situacao]}>{rotuloDaSituacao(t.situacao)}</StatusBadge>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {form ? <FormularioDeTrabalho inicial={form} onCancelar={() => setForm(null)} onSalvar={salvar} /> : null}
    </>
  );
}

const setaDoMes = {
  width: 36,
  height: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-card)',
  border: 'var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
} as const;
