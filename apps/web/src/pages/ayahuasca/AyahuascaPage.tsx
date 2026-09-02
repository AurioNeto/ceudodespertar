import { useState } from 'react';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { formatarLitros, pluralizar } from '../../lib/formato';
import {
  lotesIniciais,
  movimentosIniciais,
  reservadoInicial,
  reservasIniciais,
  rotuloDoMovimento,
  type LoteDeDaime,
  type MovimentoDeDaime,
  type SituacaoDoLote,
} from '../../mocks/ayahuasca';

type Aba = 'lotes' | 'movimentos' | 'reservas';
type ModoDoFormulario = 'feitio' | 'saida' | 'transferencia';

interface RascunhoDeMovimento {
  modo: ModoDoFormulario;
  codigo: string;
  origem: string;
  forca: string;
  loteId: string;
  litros: string;
  destino: string;
}

const SITUACAO: Record<SituacaoDoLote, { label: string; tone: BadgeTone }> = {
  'em uso': { label: 'Em uso', tone: 'confirmed' },
  lacrado: { label: 'Lacrado', tone: 'royal' },
  quarentena: { label: 'Quarentena', tone: 'pending' },
  esgotado: { label: 'Esgotado', tone: 'neutral' },
};

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const litros = (n: number) => `${formatarLitros(n)} L`;

const paraNumero = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};

export function AyahuascaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [aba, setAba] = useState<Aba>('lotes');
  const [lotes, setLotes] = useState<readonly LoteDeDaime[]>(lotesIniciais);
  const [movimentos, setMovimentos] = useState<readonly MovimentoDeDaime[]>(movimentosIniciais);
  const [reservado, setReservado] = useState<Record<number, boolean>>({ ...reservadoInicial });
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [form, setForm] = useState<RascunhoDeMovimento | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const emEstoque = lotes.filter((l) => l.situacao !== 'quarentena').reduce((a, l) => a + l.restante, 0);
  const emQuarentena = lotes.filter((l) => l.situacao === 'quarentena').reduce((a, l) => a + l.restante, 0);
  const reservadoTotal = reservasIniciais.filter((r) => reservado[r.id]).reduce((a, r) => a + r.litros, 0);
  const livre = emEstoque - reservadoTotal;
  const previsto = reservasIniciais.reduce((a, r) => a + r.litros, 0);

  const detalhe = lotes.find((l) => l.id === detalheId) ?? null;

  /** O saldo do lote é o guarda-corpo: nenhuma saída passa do que existe. */
  const erroDoFormulario = (f: RascunhoDeMovimento | null): string | null => {
    if (!f) return null;
    const quantidade = paraNumero(f.litros);
    if (f.modo === 'feitio') {
      if (!f.codigo.trim()) return 'Dê um código ao lote (ex.: Lote 01/2027).';
      if (quantidade <= 0) return 'Informe quantos litros entraram.';
      return null;
    }
    const lote = lotes.find((l) => String(l.id) === f.loteId);
    if (!lote) return 'Escolha um lote com daime disponível.';
    if (quantidade <= 0) return 'Informe quantos litros vão sair.';
    if (quantidade > lote.restante) return `${lote.codigo} tem só ${litros(lote.restante)} disponíveis.`;
    if (lote.situacao === 'quarentena') return `${lote.codigo} está em quarentena e não pode sair.`;
    return null;
  };

  const erro = erroDoFormulario(form);

  const salvar = () => {
    if (!form || erro) return;
    const quantidade = paraNumero(form.litros);

    if (form.modo === 'feitio') {
      const novo: LoteDeDaime = {
        id: Date.now(),
        codigo: form.codigo.trim(),
        origem: form.origem.trim() || 'Feitio · CDD',
        data: '02/09/2026',
        forca: form.forca || 'Força 2',
        litros: quantidade,
        restante: quantidade,
        local: 'Casa de feitio',
        guardiao: 'Chico Aguiar',
        situacao: 'lacrado',
        analise: 'aguardando análise',
        garrafas: `${Math.round(quantidade * 2)} garrafas de 500 ml`,
      };
      setLotes((lista) => [novo, ...lista]);
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: 'entrada',
          loteId: novo.id,
          litros: quantidade,
          destino: novo.origem,
          responsavel: 'Chico Aguiar',
        },
        ...lista,
      ]);
      setMensagem(`${novo.codigo} criado com ${litros(quantidade)}.`);
    } else {
      const lote = lotes.find((l) => String(l.id) === form.loteId)!;
      const restante = +(lote.restante - quantidade).toFixed(1);
      setLotes((lista) =>
        lista.map((l) =>
          l.id === lote.id ? { ...l, restante, situacao: restante === 0 ? 'esgotado' : l.situacao } : l,
        ),
      );
      setMovimentos((lista) => [
        {
          id: Date.now(),
          data: '02/09/2026',
          tipo: form.modo === 'saida' ? 'saida' : 'transferencia',
          loteId: lote.id,
          litros: quantidade,
          destino: form.destino.trim() || (form.modo === 'saida' ? 'trabalho' : 'outra unidade'),
          responsavel: 'Aurio Neto',
        },
        ...lista,
      ]);
      setMensagem(
        form.modo === 'saida'
          ? `Baixa de ${litros(quantidade)} em ${lote.codigo}.`
          : `Transferência de ${litros(quantidade)} de ${lote.codigo}.`,
      );
    }
    setForm(null);
  };

  const disponiveis = lotes.filter((l) => l.restante > 0 && l.situacao !== 'quarentena');

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-02' : 'E-02 · Ayahuasca'}
        title="Ayahuasca"
        subtitle={campo ? undefined : 'Lotes, movimentos e reservas por trabalho · CDD'}
        density={densidade}
        actions={
          <>
            <Button
              iconName="plus"
              onClick={() =>
                setForm({ modo: 'feitio', codigo: '', origem: '', forca: 'Força 2', loteId: '', litros: '', destino: '' })
              }
            >
              Entrada de feitio
            </Button>
            <Button
              variant="ghost"
              iconName="minus"
              onClick={() =>
                setForm({
                  modo: 'saida',
                  codigo: '',
                  origem: '',
                  forca: '',
                  loteId: String(disponiveis[0]?.id ?? ''),
                  litros: '',
                  destino: '',
                })
              }
            >
              Registrar saída
            </Button>
            <Button
              variant="ghost"
              iconName="arrow-left-right"
              onClick={() =>
                setForm({
                  modo: 'transferencia',
                  codigo: '',
                  origem: '',
                  forca: '',
                  loteId: String(disponiveis[0]?.id ?? ''),
                  litros: '',
                  destino: '',
                })
              }
            >
              Transferir
            </Button>
          </>
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <Kpi
            rotulo="Em estoque"
            valor={litros(emEstoque)}
            nota={pluralizar(lotes.filter((l) => l.restante > 0).length, 'lote com daime', 'lotes com daime')}
          />
          <Kpi rotulo="Reservado" valor={litros(reservadoTotal)} nota="separado para trabalhos confirmados" cor="var(--text-primary)" />
          <Kpi
            rotulo="Livre"
            valor={litros(livre)}
            nota={livre >= 0 ? 'disponível para novas reservas' : 'reservas passam do estoque'}
            cor={livre >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)'}
          />
          <Kpi
            rotulo="Previsto até out."
            valor={litros(previsto)}
            nota={pluralizar(reservasIniciais.length, 'trabalho na agenda', 'trabalhos na agenda')}
            cor="var(--text-primary)"
          />
        </div>

        {previsto > emEstoque || emQuarentena > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-pending-soft)',
              border: '1px solid var(--color-pending-border)',
              borderRadius: 'var(--radius)',
              padding: '11px 14px',
            }}
          >
            <Icon name="triangle-alert" size={18} color="var(--color-pending)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
              {previsto > emEstoque
                ? `Os trabalhos da agenda pedem ${litros(previsto)} e o estoque tem ${litros(emEstoque)}. Faltam ${litros(previsto - emEstoque)} até o bailado de 27/09.`
                : `Há ${litros(emQuarentena)} em quarentena, fora do estoque disponível.`}
            </span>
          </div>
        ) : null}

        <SeletorDeTipo
          opcoes={[
            { valor: 'lotes', label: 'Lotes' },
            { valor: 'movimentos', label: 'Movimentos' },
            { valor: 'reservas', label: 'Reservas' },
          ]}
          valor={aba}
          onEscolher={setAba}
          densidade={densidade}
        />

        {aba === 'lotes' ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
              gap: 12,
            }}
          >
            {lotes.map((l) => {
              const info = SITUACAO[l.situacao];
              const cor =
                l.situacao === 'quarentena'
                  ? 'var(--color-pending)'
                  : l.restante === 0
                    ? 'var(--color-line-strong)'
                    : 'var(--color-royal)';
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setDetalheId(l.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                    padding: '14px 16px',
                    border: 'var(--border-hairline)',
                    borderLeft: `3px solid ${cor}`,
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-card)',
                    cursor: 'pointer',
                    height: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)', flex: 1 }}>
                      {l.codigo}
                    </span>
                    <StatusBadge tone={info.tone}>{info.label}</StatusBadge>
                  </div>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                    {l.origem} · {l.data}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      style={{
                        font: 'var(--text-amount-lg)',
                        letterSpacing: 'var(--tracking-amount)',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--color-royal-deep)',
                      }}
                    >
                      {litros(l.restante)}
                    </span>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                      de {litros(l.litros)}
                    </span>
                  </div>
                  <span
                    style={{
                      width: '100%',
                      height: 8,
                      borderRadius: 'var(--radius-pill)',
                      background: 'var(--bg-sunken)',
                      overflow: 'hidden',
                      display: 'block',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        borderRadius: 'var(--radius-pill)',
                        background: cor,
                        width: `${l.litros ? Math.max(0, (l.restante / l.litros) * 100) : 0}%`,
                        transition: 'width 420ms cubic-bezier(.22,.61,.36,1)',
                      }}
                    />
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      font: 'var(--text-small)',
                      color: 'var(--text-meta)',
                    }}
                  >
                    <span>
                      {l.forca} · {l.local}
                    </span>
                    <span>{l.guardiao}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {aba === 'movimentos' ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            {movimentos.map((m, i) => {
              const lote = lotes.find((l) => l.id === m.loteId);
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: campo ? 'minmax(0,1fr) auto' : '110px 170px 150px minmax(0,1fr) 110px',
                    alignItems: 'center',
                    gap: campo ? 8 : 0,
                    padding: '11px 13px',
                    borderBottom: i === movimentos.length - 1 ? 0 : 'var(--border-hairline)',
                    font: 'var(--text-small)',
                  }}
                >
                  {campo ? (
                    <>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{m.destino}</span>
                        <span style={{ color: 'var(--text-meta)' }}>
                          {m.data} · {rotuloDoMovimento[m.tipo]} · {lote?.codigo}
                        </span>
                      </span>
                      <span style={{ ...valorTabular, color: corDoMovimento(m.tipo) }}>
                        {m.tipo === 'entrada' ? '+ ' : '− '}
                        {litros(m.litros)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{m.data}</span>
                      <span style={{ color: corDoMovimento(m.tipo) }}>{rotuloDoMovimento[m.tipo]}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{lote?.codigo}</span>
                      <span style={{ minWidth: 0, color: 'var(--text-primary)' }}>
                        {m.destino}
                        <span style={{ color: 'var(--text-meta)' }}> · {m.responsavel}</span>
                      </span>
                      <span style={{ ...valorTabular, textAlign: 'right', color: corDoMovimento(m.tipo) }}>
                        {m.tipo === 'entrada' ? '+ ' : '− '}
                        {litros(m.litros)}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {aba === 'reservas' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Reservar separa do livre; a baixa no lote só acontece no dia do trabalho.
            </p>
            {reservasIniciais.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '12px 14px',
                  border: 'var(--border-hairline)',
                  borderLeft: `3px solid ${reservado[r.id] ? 'var(--color-confirmed)' : 'var(--color-line-strong)'}`,
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-card)',
                }}
              >
                <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.nome}</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                    {r.dia}/{r.mes} · {litros(r.litros)} previstos
                  </span>
                </span>
                <StatusBadge tone={reservado[r.id] ? 'confirmed' : 'pending'}>
                  {reservado[r.id] ? 'Reservado' : 'Sem reserva'}
                </StatusBadge>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setReservado((atual) => ({ ...atual, [r.id]: !atual[r.id] }));
                    setMensagem(
                      reservado[r.id]
                        ? `Reserva liberada: ${litros(r.litros)} voltam para o livre.`
                        : `${litros(r.litros)} reservados para ${r.nome}.`,
                    );
                  }}
                >
                  {reservado[r.id] ? 'Liberar' : 'Reservar'}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {detalhe ? (
        <FichaDoLote
          lote={detalhe}
          movimentos={movimentos.filter((m) => m.loteId === detalhe.id)}
          campo={campo}
          onFechar={() => setDetalheId(null)}
          onQuarentena={() => {
            const emQuarentenaAgora = detalhe.situacao === 'quarentena';
            setLotes((lista) =>
              lista.map((l) =>
                l.id === detalhe.id
                  ? { ...l, situacao: emQuarentenaAgora ? (l.restante > 0 ? 'em uso' : 'esgotado') : 'quarentena' }
                  : l,
              ),
            );
            setMensagem(
              emQuarentenaAgora
                ? `${detalhe.codigo} saiu da quarentena.`
                : `${detalhe.codigo} posto em quarentena — fora do estoque disponível.`,
            );
          }}
        />
      ) : null}

      {form ? (
        <ModalDeMovimento
          form={form}
          erro={erro}
          lotes={disponiveis}
          onMudar={setForm}
          onCancelar={() => setForm(null)}
          onSalvar={salvar}
        />
      ) : null}
    </>
  );
}

const valorTabular = {
  font: 'var(--text-amount)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;

const corDoMovimento = (tipo: MovimentoDeDaime['tipo']) =>
  tipo === 'entrada'
    ? 'var(--color-confirmed)'
    : tipo === 'perda'
      ? 'var(--color-attention)'
      : tipo === 'transferencia'
        ? 'var(--color-royal)'
        : 'var(--text-primary)';

function Kpi({ rotulo, valor, nota, cor = 'var(--color-royal-deep)' }: { rotulo: string; valor: string; nota: string; cor?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
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
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
    </div>
  );
}

function FichaDoLote({
  lote,
  movimentos,
  campo,
  onFechar,
  onQuarentena,
}: {
  lote: LoteDeDaime;
  movimentos: readonly MovimentoDeDaime[];
  campo: boolean;
  onFechar: () => void;
  onQuarentena: () => void;
}) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(59,38,23,.38)',
        display: 'flex',
        alignItems: campo ? 'flex-end' : 'stretch',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: campo ? '100%' : 'min(460px, 100%)',
          maxHeight: campo ? '86%' : '100%',
          overflow: 'auto',
          background: 'var(--bg-app)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-sheet)',
          padding: '18px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)', flex: 1 }}>{lote.codigo}</span>
          <StatusBadge tone={SITUACAO[lote.situacao].tone}>{SITUACAO[lote.situacao].label}</StatusBadge>
          <button type="button" onClick={onFechar} aria-label="Fechar ficha" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <Dado rotulo="Restante" valor={litros(lote.restante)} />
          <Dado rotulo="Entrada" valor={litros(lote.litros)} />
          <Dado rotulo="Força" valor={lote.forca} />
          <Dado rotulo="Origem" valor={lote.origem} />
          <Dado rotulo="Local" valor={lote.local} />
          <Dado rotulo="Guardião" valor={lote.guardiao} />
          <Dado rotulo="Envase" valor={lote.garrafas} />
          <Dado rotulo="Análise" valor={lote.analise} />
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <span style={rotuloLabel}>Movimentos deste lote</span>
          {movimentos.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span
                style={{ font: 'var(--text-code)', color: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}
              >
                {m.data}
              </span>
              <span style={{ flex: 1, minWidth: 0, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {rotuloDoMovimento[m.tipo]} · {m.destino}
              </span>
              <span style={{ ...valorTabular, color: corDoMovimento(m.tipo) }}>
                {m.tipo === 'entrada' ? '+ ' : '− '}
                {litros(m.litros)}
              </span>
            </div>
          ))}
        </div>

        <Button variant="quiet" iconName="shield-alert" onClick={onQuarentena} style={{ alignSelf: 'flex-start' }}>
          {lote.situacao === 'quarentena' ? 'Tirar da quarentena' : 'Pôr em quarentena'}
        </Button>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{valor}</span>
    </div>
  );
}

function ModalDeMovimento({
  form,
  erro,
  lotes,
  onMudar,
  onCancelar,
  onSalvar,
}: {
  form: RascunhoDeMovimento;
  erro: string | null;
  lotes: readonly LoteDeDaime[];
  onMudar: (f: RascunhoDeMovimento) => void;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  const titulo =
    form.modo === 'feitio' ? 'Entrada de feitio' : form.modo === 'saida' ? 'Registrar saída' : 'Transferir para outra unidade';

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,20,24,0.42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: '100%',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-raised)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: 'var(--border-hairline)',
          }}
        >
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{titulo}</span>
          <button type="button" onClick={onCancelar} aria-label="fechar" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {form.modo === 'feitio' ? (
            <>
              <TextField
                label="Código do lote"
                value={form.codigo}
                onChange={(e) => onMudar({ ...form, codigo: e.target.value })}
                placeholder="Lote 12/2026"
              />
              <TextField
                label="Origem"
                value={form.origem}
                onChange={(e) => onMudar({ ...form, origem: e.target.value })}
                placeholder="Feitio de dezembro · CDD"
              />
              <Select
                label="Força"
                value={form.forca}
                options={['Força 1', 'Força 2', 'Força 3'].map((f) => ({ value: f, label: f }))}
                onChange={(v) => onMudar({ ...form, forca: v })}
              />
            </>
          ) : (
            <>
              <Select
                label="Lote"
                value={form.loteId}
                options={lotes.map((l) => ({ value: String(l.id), label: `${l.codigo} · ${litros(l.restante)}` }))}
                onChange={(v) => onMudar({ ...form, loteId: v })}
              />
              <TextField
                label={form.modo === 'saida' ? 'Trabalho' : 'Unidade de destino'}
                value={form.destino}
                onChange={(e) => onMudar({ ...form, destino: e.target.value })}
                placeholder={form.modo === 'saida' ? 'Mãe Divina · setembro' : 'Céu do Vale'}
              />
            </>
          )}

          <TextField
            label="Litros"
            value={form.litros}
            onChange={(e) => onMudar({ ...form, litros: e.target.value })}
            inputMode="decimal"
            placeholder="9"
          />

          {erro ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--color-attention-soft)',
                border: '1px solid var(--color-attention-border)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
              }}
            >
              <Icon name="triangle-alert" size={16} color="var(--color-attention)" />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{erro}</span>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            justifyContent: 'flex-end',
            padding: '12px 20px 16px',
            borderTop: 'var(--border-hairline)',
            alignItems: 'flex-start',
          }}
        >
          <Button variant="quiet" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button iconName="check" disabled={!!erro} blockedReason={erro ?? undefined} onClick={onSalvar}>
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}
