import { useMemo, useState } from 'react';
import type { LancamentoNaLista } from '@cdd/contracts';
import { Button, Icon, Receipt, RecordRow, ScreenHeader, StatusBadge, EmptyState } from '../../ds';
import { Paginacao } from '../../components/Paginacao';
import { Select } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, formatarDiaMes, formatarDinheiro, pluralizar } from '../../lib/formato';
import { estadoDaLinha, linhasDoRecibo, naturezaDoTipo, rodapeDoRecibo, tomDoRecibo } from '../../lib/recibo';
import { corDoTipo, lancamentos, rotuloDaSituacao, rotuloDoTipo } from '../../mocks/lancamentos';

const POR_PAGINA = 8;

const FILTRO_INICIAL = {
  periodo: '2026-08',
  tipo: 'todos',
  grupo: 'todos',
  status: 'todos',
  busca: '',
} as const;

const OPCOES_PERIODO = [
  { value: '2026-08', label: 'Agosto 2026' },
  { value: '2026-07', label: 'Julho 2026' },
  { value: 'todos', label: 'Todo o histórico' },
];

const OPCOES_TIPO = [
  { value: 'todos', label: 'Todos' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
];

const OPCOES_STATUS = [
  { value: 'todos', label: 'Todas' },
  { value: 'A_CONFERIR', label: 'A conferir' },
  { value: 'CONFIRMADO', label: 'Consolidado' },
  { value: 'ESTORNADO', label: 'Estornado' },
];

const GRUPOS = ['Lojinha', 'Dormitório', 'Chácara (Infraestrutura)', 'CDD', 'Cozinha', 'Secretaria'];
const OPCOES_GRUPO = [{ value: 'todos', label: 'Todos os grupos' }, ...GRUPOS.map((g) => ({ value: g, label: g }))];

const CHIPS_TIPO = [
  { value: 'todos', label: 'Todos' },
  { value: 'SAIDA', label: 'Saída' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'TRANSFERENCIA', label: 'Transf.' },
];

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const valorTabular = {
  font: 'var(--text-amount)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;

export function LancamentosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const [filtros, setFiltros] = useState<Record<string, string>>({ ...FILTRO_INICIAL });
  const [pagina, setPagina] = useState(0);
  const [selecionado, setSelecionado] = useState<LancamentoNaLista | null>(null);

  const filtrar = (campoFiltro: string, valor: string) => {
    setFiltros((f) => ({ ...f, [campoFiltro]: valor }));
    setPagina(0);
    setSelecionado(null);
  };

  const lista = useMemo(() => {
    const busca = (filtros.busca ?? '').trim().toLowerCase();
    return lancamentos.filter((r) => {
      if (filtros.periodo !== 'todos' && r.competencia !== filtros.periodo) return false;
      if (filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false;
      if (filtros.grupo !== 'todos' && r.grupo !== filtros.grupo) return false;
      if (filtros.status !== 'todos' && r.status !== filtros.status) return false;
      if (busca && ![r.motivo, r.contraparte ?? '', r.registradoPor].join(' ').toLowerCase().includes(busca))
        return false;
      return true;
    });
  }, [filtros]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const daPagina = lista.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA);

  const vivos = lista.filter((r) => r.status !== 'ESTORNADO');
  const entradas = vivos.filter((r) => r.tipo === 'ENTRADA').reduce((a, r) => a + r.valor, 0);
  const saidas = vivos.filter((r) => r.tipo === 'SAIDA').reduce((a, r) => a + r.valor, 0);
  const aConferir = lista.filter((r) => r.status === 'A_CONFERIR').length;

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-03' : 'F-03 · Lançamentos'}
        title="Lançamentos"
        subtitle={campo ? undefined : 'Todos os lançamentos da unidade, de todas as pessoas · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 20px' : '18px 24px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 16,
          minWidth: 0,
        }}
      >
        {campo ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CHIPS_TIPO.map((c) => {
              const on = filtros.tipo === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => filtrar('tipo', c.value)}
                  aria-pressed={on}
                  style={{
                    font: 'var(--text-small)',
                    padding: '9px 13px',
                    minHeight: 40,
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    border: `1px solid ${on ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                    background: on ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                    color: on ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-card)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: 14,
              alignItems: 'end',
            }}
          >
            <Select
              label="Período"
              value={filtros.periodo ?? 'todos'}
              options={OPCOES_PERIODO}
              onChange={(v) => filtrar('periodo', v)}
            />
            <Select
              label="Tipo"
              value={filtros.tipo ?? 'todos'}
              options={OPCOES_TIPO}
              onChange={(v) => filtrar('tipo', v)}
            />
            <Select
              label="Grupo"
              value={filtros.grupo ?? 'todos'}
              options={OPCOES_GRUPO}
              onChange={(v) => filtrar('grupo', v)}
            />
            <Select
              label="Situação"
              value={filtros.status ?? 'todos'}
              options={OPCOES_STATUS}
              onChange={(v) => filtrar('status', v)}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ ...rotuloLabel, marginBottom: 7 }}>Busca</span>
              <input
                value={filtros.busca ?? ''}
                onChange={(e) => filtrar('busca', e.target.value)}
                placeholder="motivo, fornecedor ou quem lançou"
                aria-label="Buscar por motivo, fornecedor ou quem lançou"
                style={{
                  minHeight: 'var(--target-office)',
                  border: '1px solid var(--color-line-strong)',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 13px',
                  font: 'var(--text-body)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>
            <Button variant="quiet" onClick={() => setFiltros({ ...FILTRO_INICIAL })}>
              Limpar filtros
            </Button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(3,minmax(0,1fr))' : 'repeat(auto-fit,minmax(160px,1fr))',
            gap: campo ? 10 : 14,
            background: 'var(--bg-sunken)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: campo ? '10px 12px' : '14px 18px',
          }}
        >
          <Total rotulo="Entradas" valor={formatarDinheiro(entradas)} cor="var(--color-confirmed)" />
          <Total rotulo="Saídas" valor={formatarDinheiro(saidas)} cor="var(--color-attention)" />
          <Total
            rotulo={campo ? 'Saldo' : 'Saldo do período'}
            valor={formatarDinheiro(entradas - saidas)}
            cor="var(--text-primary)"
          />
          {campo ? null : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={rotuloLabel}>A conferir</span>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--color-pending)' }}>
                {aConferir} de {lista.length}
              </span>
            </div>
          )}
        </div>

        {lista.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento neste recorte"
            description="Troque o período ou limpe os filtros para ver o livro inteiro."
            action={
              <Button variant="ghost" onClick={() => setFiltros({ ...FILTRO_INICIAL })}>
                Limpar filtros
              </Button>
            }
          />
        ) : campo ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {daPagina.map((r) => (
              <RecordRow
                key={r.id}
                description={r.motivo}
                amount={r.valor / 100}
                nature={naturezaDoTipo(r.tipo)}
                meta={`${formatarDiaMes(r.data)} · ${rotuloDoTipo(r.tipo)} · ${r.registradoPor}`}
                status={estadoDaLinha(r.status)}
                onClick={() => setSelecionado(r)}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-card)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '96px minmax(0,1fr) 150px 132px 116px 132px',
                background: 'var(--bg-sunken)',
                borderBottom: '1px solid var(--color-line-strong)',
              }}
            >
              {['Data', 'Lançamento', 'Quem lançou', 'Grupo', 'Tipo', 'Valor'].map((c, i) => (
                <span key={c} style={{ ...rotuloLabel, padding: '10px 13px', textAlign: i === 5 ? 'right' : 'left' }}>
                  {c}
                </span>
              ))}
            </div>

            {daPagina.map((r) => {
              const estornado = r.status === 'ESTORNADO';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelecionado(r)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '96px minmax(0,1fr) 150px 132px 116px 132px',
                    alignItems: 'center',
                    width: '100%',
                    padding: '11px 13px',
                    background: selecionado?.id === r.id ? 'var(--bg-sunken)' : 'transparent',
                    borderBottom: 'var(--border-hairline)',
                    borderLeft: `3px solid ${
                      r.status === 'A_CONFERIR'
                        ? 'var(--color-pending)'
                        : estornado
                          ? 'var(--color-neutral)'
                          : 'transparent'
                    }`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'var(--text-small)',
                  }}
                >
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                    {formatarDiaMes(r.data)}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                      {r.motivo}
                    </span>
                    <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                      {r.tipo === 'TRANSFERENCIA'
                        ? `${r.conta} → ${r.contaDestino}`
                        : `${r.contraparte ?? '—'} · ${r.conta}`}
                    </span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.registradoPor}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{r.grupo ?? '—'}</span>
                  <span
                    style={{
                      justifySelf: 'start',
                      font: 'var(--text-small)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: `1px solid ${corDoTipo(r.tipo)}`,
                      color: corDoTipo(r.tipo),
                    }}
                  >
                    {rotuloDoTipo(r.tipo)}
                  </span>
                  <span
                    style={{
                      ...valorTabular,
                      textAlign: 'right',
                      color: estornado
                        ? 'var(--text-meta)'
                        : r.tipo === 'ENTRADA'
                          ? 'var(--color-confirmed)'
                          : 'var(--text-primary)',
                      textDecoration: estornado ? 'line-through' : undefined,
                    }}
                  >
                    {r.tipo === 'ENTRADA' ? '+ ' : r.tipo === 'SAIDA' ? '− ' : ''}
                    {formatarDinheiro(r.valor)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {lista.length > 0 ? (
          <Paginacao
            pagina={paginaAtual}
            totalPaginas={totalPaginas}
            texto={`Página ${paginaAtual + 1} de ${totalPaginas} · ${pluralizar(lista.length, 'lançamento')}`}
            onAnterior={() => {
              setPagina(Math.max(0, paginaAtual - 1));
              setSelecionado(null);
            }}
            onProxima={() => {
              setPagina(Math.min(totalPaginas - 1, paginaAtual + 1));
              setSelecionado(null);
            }}
            densidade={densidade}
          />
        ) : null}
      </div>

      {selecionado ? (
        <GavetaDeDetalhe registro={selecionado} campo={campo} onFechar={() => setSelecionado(null)} />
      ) : null}
    </div>
  );
}

function Total({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={rotuloLabel}>{rotulo}</span>
      <span style={{ ...valorTabular, color: cor }}>{valor}</span>
    </div>
  );
}

function GavetaDeDetalhe({
  registro,
  campo,
  onFechar,
}: {
  registro: LancamentoNaLista;
  campo: boolean;
  onFechar: () => void;
}) {
  const estornado = registro.status === 'ESTORNADO';

  const historico = [
    { quando: `${formatarData(registro.data)} ${registro.hora}`, texto: `Lançado por ${registro.registradoPor}.` },
    registro.status === 'A_CONFERIR'
      ? { quando: '—', texto: 'Aguardando conferência da tesouraria.' }
      : { quando: `${formatarData(registro.data)} 21:04`, texto: 'Consolidado por Aurio Neto.' },
    ...(estornado ? [{ quando: '20/08/2026 09:30', texto: 'Estornado: valor lançado em duplicidade.' }] : []),
  ];

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
          width: campo ? '100%' : 'min(480px, 100%)',
          maxHeight: campo ? '86%' : '100%',
          overflow: 'auto',
          background: 'var(--bg-app)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-sheet)',
          padding: '18px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)', flex: 1 }}>Detalhe do lançamento</span>
          <StatusBadge tone={registro.status === 'A_CONFERIR' ? 'pending' : estornado ? 'neutral' : 'confirmed'}>
            {rotuloDaSituacao(registro.status)}
          </StatusBadge>
          <button type="button" onClick={onFechar} aria-label="Fechar detalhe" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <Receipt
          title={`Registrado em ${formatarData(registro.data)} às ${registro.hora}`}
          amount={registro.valor / 100}
          tone={tomDoRecibo(registro.tipo)}
          lines={linhasDoRecibo(registro, { mostrarQuemLancou: true })}
          footnote={rodapeDoRecibo(registro)}
        />

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
          <span style={rotuloLabel}>Histórico</span>
          {historico.map((h) => (
            <div key={h.texto} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span
                style={{
                  font: 'var(--text-code)',
                  color: 'var(--text-meta)',
                  fontVariantNumeric: 'tabular-nums',
                  flex: '0 0 auto',
                }}
              >
                {h.quando}
              </span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{h.texto}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="paperclip" disabled={!registro.comprovante}>
            Ver comprovante
          </Button>
          <Button
            variant="quiet"
            iconName="undo-2"
            disabled={estornado}
            blockedReason={estornado ? 'Este lançamento já foi estornado.' : undefined}
          >
            Estornar
          </Button>
        </div>
      </div>
    </div>
  );
}
