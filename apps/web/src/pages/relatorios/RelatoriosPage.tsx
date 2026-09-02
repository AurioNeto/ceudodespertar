import { useState } from 'react';
import { Button, Icon, ScreenHeader } from '../../ds';
import { Select } from '../../components/Campo';
import { useDensidade } from '../../lib/useDensidade';
import { formatarValor, pluralizar } from '../../lib/formato';
import {
  CATEGORIAS_DE_ENTRADA,
  CATEGORIAS_DE_SAIDA,
  CERIMONIAS,
  CONTAS,
  GRUPOS,
  metasDeFundo,
  type LinhaDoRelatorio,
} from '../../mocks/relatorios';
import { GraficoSerie } from './GraficoSerie';
import { PainelDeQuebra } from './PainelDeQuebra';
import { corDoDelta, textoDoDelta, useRelatorio, type Comparacao, type Filtros, type Periodo } from './useRelatorio';

interface Drill {
  rotulo: string;
  campo: 'grupo' | 'categoria' | 'conta' | 'cerimonia';
  valor: string;
  tipo: 'saida' | null;
}

const PERIODOS: readonly { valor: Periodo; label: string }[] = [
  { valor: 'mes', label: 'Mês' },
  { valor: 'trimestre', label: 'Trimestre' },
  { valor: 'ano', label: 'Ano' },
  { valor: 'personalizado', label: 'Personalizado' },
];

const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

const comOpcaoTodos = (todos: [string, string], lista: readonly string[]) => [
  { value: todos[0], label: todos[1] },
  ...lista.map((v) => ({ value: v, label: v })),
];

export function RelatoriosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const r = useRelatorio();
  const [filtrosAbertos, setFiltrosAbertos] = useState(!campo);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const abrirDrill = (d: Drill) => setDrill(d);

  const resumoDoRecorte = [
    r.rotuloPeriodo,
    r.unidades.join(' + '),
    r.filtros.grupo !== 'todos' ? r.filtros.grupo : null,
    r.filtros.categoria !== 'todas' ? r.filtros.categoria : null,
    r.filtros.conta !== 'todas' ? r.filtros.conta : null,
    r.filtros.tipo !== 'todos' ? r.filtros.tipo : null,
    r.filtros.cerimonia !== 'todas' ? r.filtros.cerimonia : null,
    r.filtros.situacao !== 'todas' ? r.filtros.situacao : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const kpis = [
    {
      label: 'Entradas',
      valor: r.entradas,
      base: r.comparados?.entradas ?? null,
      cor: 'var(--color-confirmed)',
      bomSeSobe: true,
      nota: null,
    },
    {
      label: 'Saídas',
      valor: r.saidas,
      base: r.comparados?.saidas ?? null,
      cor: 'var(--color-attention)',
      bomSeSobe: false,
      nota: null,
    },
    {
      label: 'Resultado',
      valor: r.resultado,
      base: r.comparados?.resultado ?? null,
      cor: r.resultado >= 0 ? 'var(--color-royal-deep)' : 'var(--color-attention)',
      bomSeSobe: true,
      nota: null,
    },
    {
      label: 'Transferências',
      valor: r.transferencias,
      base: null,
      cor: 'var(--text-primary)',
      bomSeSobe: true,
      nota: `${pluralizar(r.transferenciasQtd, 'movimento')} entre contas`,
    },
  ];

  const linhasDoDrill: readonly LinhaDoRelatorio[] = drill
    ? r.atual.filter((l) => l[drill.campo] === drill.valor && (!drill.tipo || l.tipo === drill.tipo))
    : [];
  const totalDoDrill = linhasDoDrill.reduce((a, l) => a + l.valor, 0);

  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      <ScreenHeader
        code={campo ? 'F-06' : 'F-06 · Relatórios'}
        title="Relatórios"
        subtitle={campo ? undefined : 'Período, unidade e recorte — do total ao lançamento'}
        density={densidade}
        actions={
          <>
            <Button variant="ghost" iconName="file-down" onClick={() => setMensagem(`Relatório de ${r.rotuloPeriodo} preparado em PDF.`)}>
              PDF
            </Button>
            <Button
              variant="ghost"
              iconName="file-spreadsheet"
              onClick={() =>
                setMensagem(`Planilha de ${r.rotuloPeriodo} gerada com ${pluralizar(r.atual.length, 'lançamento')}.`)
              }
            >
              Planilha
            </Button>
          </>
        }
      />

      <div
        style={{
          padding: campo ? '14px 16px 22px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          maxWidth: campo ? undefined : 1120,
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
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: campo ? '12px 14px' : '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: filtrosAbertos ? 14 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFiltrosAbertos((a) => !a)}
              aria-expanded={filtrosAbertos}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                font: 'var(--text-body-strong)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <Icon name={filtrosAbertos ? 'chevron-down' : 'chevron-right'} size={16} color="var(--color-royal)" />
              {filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
            {filtrosAbertos ? null : (
              <span
                style={{
                  font: 'var(--text-small)',
                  color: 'var(--text-secondary)',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {resumoDoRecorte}
              </span>
            )}
          </div>

          {filtrosAbertos ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {PERIODOS.map((p) => (
                  <Chip key={p.valor} ativo={r.periodo === p.valor} onClick={() => r.setPeriodo(p.valor)}>
                    {p.label}
                  </Chip>
                ))}
                <span style={{ width: 1, height: 24, background: 'var(--color-line)' }} />
                {(['CDD', 'Munay'] as const).map((u) => (
                  <Chip key={u} ativo={r.unidades.includes(u)} onClick={() => r.alternarUnidade(u)}>
                    {u}
                  </Chip>
                ))}
              </div>

              {r.periodo === 'personalizado' ? (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <CampoDeMes rotulo="De" valor={r.de} onMudar={r.setDe} />
                  <CampoDeMes rotulo="Até" valor={r.ate} onMudar={r.setAte} />
                </div>
              ) : null}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(auto-fit,minmax(170px,1fr))',
                  gap: 12,
                }}
              >
                <Select
                  label="Comparar com"
                  value={r.comparar}
                  options={[
                    { value: 'anterior', label: 'Período anterior' },
                    { value: 'ano_passado', label: 'Mesmo período do ano passado' },
                    { value: 'nenhum', label: 'Sem comparação' },
                  ]}
                  onChange={(v) => r.setComparar(v as Comparacao)}
                />
                <Select
                  label="Grupo"
                  value={r.filtros.grupo}
                  options={comOpcaoTodos(['todos', 'Todos'], GRUPOS)}
                  onChange={(v) => r.setFiltro('grupo', v)}
                />
                <Select
                  label="Categoria"
                  value={r.filtros.categoria}
                  options={comOpcaoTodos(['todas', 'Todas'], [...CATEGORIAS_DE_SAIDA, ...CATEGORIAS_DE_ENTRADA])}
                  onChange={(v) => r.setFiltro('categoria', v)}
                />
                <Select
                  label="Conta"
                  value={r.filtros.conta}
                  options={comOpcaoTodos(['todas', 'Todas'], CONTAS)}
                  onChange={(v) => r.setFiltro('conta', v)}
                />
                <Select
                  label="Tipo"
                  value={r.filtros.tipo}
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'saida', label: 'Saída' },
                    { value: 'entrada', label: 'Entrada' },
                    { value: 'transferencia', label: 'Transferência' },
                  ]}
                  onChange={(v) => r.setFiltro('tipo', v)}
                />
                <Select
                  label="Cerimônia"
                  value={r.filtros.cerimonia}
                  options={comOpcaoTodos(['todas', 'Todas'], CERIMONIAS)}
                  onChange={(v) => r.setFiltro('cerimonia', v)}
                />
                <Select
                  label="Situação"
                  value={r.filtros.situacao}
                  options={[
                    { value: 'todas', label: 'Todas' },
                    { value: 'consolidado', label: 'Consolidado' },
                    { value: 'a conferir', label: 'A conferir' },
                  ]}
                  onChange={(v) => r.setFiltro('situacao', v as Filtros['situacao'])}
                />
              </div>

              <Button variant="quiet" onClick={r.limparFiltros} style={{ alignSelf: 'flex-start' }}>
                Limpar filtros
              </Button>
            </>
          ) : null}
        </div>

        <div
          style={{
            font: 'var(--text-small)',
            color: r.aConferir.length ? 'var(--color-pending)' : 'var(--text-secondary)',
            background: r.aConferir.length ? 'var(--color-pending-soft)' : 'transparent',
            border: r.aConferir.length ? '1px solid var(--color-pending-border)' : 0,
            borderRadius: 'var(--radius)',
            padding: r.aConferir.length ? '9px 13px' : 0,
          }}
        >
          {r.aConferir.length === 0
            ? 'Todos os lançamentos deste recorte estão consolidados.'
            : `Inclui ${pluralizar(r.aConferir.length, 'lançamento a conferir', 'lançamentos a conferir')} (${formatarValor(r.valorAConferir)}) — os números podem mudar depois da conferência.`}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fit,minmax(190px,1fr))',
            gap: 12,
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: 'var(--bg-card)',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                padding: campo ? '11px 12px' : '13px 15px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={rotuloLabel}>{k.label}</span>
              <span
                style={{
                  font: campo ? 'var(--text-amount)' : 'var(--text-amount-lg)',
                  letterSpacing: 'var(--tracking-amount)',
                  fontVariantNumeric: 'tabular-nums',
                  color: k.cor,
                }}
              >
                {formatarValor(k.valor)}
              </span>
              <span
                style={{
                  font: 'var(--text-small)',
                  color: k.nota ? 'var(--text-meta)' : corDoDelta(k.valor, k.base, k.bomSeSobe, r.comparar),
                }}
              >
                {k.nota ?? textoDoDelta(k.valor, k.base, r.comparar)}
              </span>
            </div>
          ))}
        </div>

        <GraficoSerie
          serie={r.serie}
          acumulados={r.acumulados}
          escala={r.escala}
          rotuloPeriodo={r.rotuloPeriodo}
          campo={campo}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <PainelDeQuebra
            titulo="Saídas por grupo"
            itens={r.porGrupo}
            campo={campo}
            onAbrir={(nome) => abrirDrill({ rotulo: 'Saídas do grupo', campo: 'grupo', valor: nome, tipo: 'saida' })}
          />
          <PainelDeQuebra
            titulo="Saídas por categoria"
            itens={r.porCategoria}
            campo={campo}
            onAbrir={(nome) =>
              abrirDrill({ rotulo: 'Saídas da categoria', campo: 'categoria', valor: nome, tipo: 'saida' })
            }
          />
        </div>

        <Cartao titulo="Movimento por conta">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!campo ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) 130px 130px 130px 110px',
                  padding: '0 0 8px',
                  borderBottom: 'var(--border-hairline)',
                }}
              >
                {['Conta', 'Entradas', 'Saídas', 'Resultado', ''].map((c, i) => (
                  <span key={c || 'acoes'} style={{ ...rotuloLabel, textAlign: i === 0 ? 'left' : 'right' }}>
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
            {r.porConta.map((c) => (
              <div
                key={c.nome}
                style={{
                  display: 'grid',
                  gridTemplateColumns: campo ? 'minmax(0,1fr) auto' : 'minmax(0,1fr) 130px 130px 130px 110px',
                  alignItems: 'center',
                  gap: campo ? 8 : 0,
                  padding: '10px 0',
                  borderBottom: 'var(--border-hairline)',
                }}
              >
                <button
                  type="button"
                  onClick={() => abrirDrill({ rotulo: 'Movimento da conta', campo: 'conta', valor: c.nome, tipo: null })}
                  style={{
                    font: 'var(--text-body-strong)',
                    color: 'var(--color-royal)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {c.nome}
                </button>
                {campo ? (
                  <span
                    style={{
                      font: 'var(--text-amount)',
                      fontVariantNumeric: 'tabular-nums',
                      color: c.resultado >= 0 ? 'var(--color-confirmed)' : 'var(--color-attention)',
                    }}
                  >
                    {formatarValor(c.resultado)}
                  </span>
                ) : (
                  <>
                    <Numero valor={c.entradas} cor="var(--color-confirmed)" />
                    <Numero valor={c.saidas} cor="var(--color-attention)" />
                    <Numero
                      valor={c.resultado}
                      cor={c.resultado >= 0 ? 'var(--text-primary)' : 'var(--color-attention)'}
                    />
                    <span style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setMensagem(`Extrato de ${c.nome} em ${r.rotuloPeriodo} exportado em planilha.`)
                        }
                        style={{ font: 'var(--text-small)', color: 'var(--text-link)', cursor: 'pointer' }}
                      >
                        exportar
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </Cartao>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
            gap: 12,
          }}
        >
          <Cartao titulo="Fundo próprio contra as metas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {metasDeFundo.map((f) => (
                <div key={f.nome} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{f.nome}</span>
                    <span
                      style={{
                        font: 'var(--text-small)',
                        color: 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatarValor(f.valor)} de {formatarValor(f.meta)}
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
                        background: f.cor,
                        width: `${Math.min(100, (f.valor / f.meta) * 100)}%`,
                        transition: 'width 520ms cubic-bezier(.22,.61,.36,1)',
                      }}
                    />
                  </span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{f.nota}</span>
                </div>
              ))}
            </div>
          </Cartao>

          <Cartao titulo="Custo por cerimônia">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {r.porCerimonia.map((c) => (
                <button
                  key={c.nome}
                  type="button"
                  onClick={() =>
                    abrirDrill({ rotulo: 'Gastos da cerimônia', campo: 'cerimonia', valor: c.nome, tipo: 'saida' })
                  }
                  style={{ display: 'flex', flexDirection: 'column', gap: 5, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                    <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{c.nome}</span>
                    <span
                      style={{
                        font: 'var(--text-small)',
                        color: 'var(--text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatarValor(c.valor)}
                    </span>
                  </span>
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
                        background: 'var(--color-pending)',
                        width: `${(c.valor / Math.max(1, ...r.porCerimonia.map((x) => x.valor))) * 100}%`,
                        transition: 'width 520ms cubic-bezier(.22,.61,.36,1)',
                      }}
                    />
                  </span>
                </button>
              ))}
            </div>
          </Cartao>
        </div>
      </div>

      {drill ? (
        <div
          onClick={() => setDrill(null)}
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
              width: campo ? '100%' : 'min(520px, 100%)',
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
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rotuloLabel}>{drill.rotulo}</div>
                <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{drill.valor}</div>
                <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {pluralizar(linhasDoDrill.length, 'lançamento')} · {formatarValor(totalDoDrill)} · {r.rotuloPeriodo}
                </div>
              </div>
              <button type="button" onClick={() => setDrill(null)} aria-label="Fechar recorte" style={{ color: 'var(--text-meta)' }}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {linhasDoDrill.slice(0, 40).map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 12,
                    padding: '9px 0',
                    borderBottom: 'var(--border-hairline)',
                  }}
                >
                  <span
                    style={{ font: 'var(--text-code)', color: 'var(--text-meta)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {l.data.slice(0, 5)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                      {l.motivo}
                    </span>
                    <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                      {(l.grupo ?? l.conta)} · {l.conta}
                      {l.situacao === 'a conferir' ? ' · a conferir' : ''}
                    </span>
                  </span>
                  <span
                    style={{
                      font: 'var(--text-amount)',
                      letterSpacing: 'var(--tracking-amount)',
                      fontVariantNumeric: 'tabular-nums',
                      color: l.tipo === 'entrada' ? 'var(--color-confirmed)' : 'var(--text-primary)',
                    }}
                  >
                    {l.tipo === 'entrada' ? '+ ' : l.tipo === 'saida' ? '− ' : ''}
                    {formatarValor(l.valor)}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant="ghost"
              iconName="file-spreadsheet"
              onClick={() => setMensagem(`Recorte exportado com ${pluralizar(linhasDoDrill.length, 'lançamento')}.`)}
            >
              Exportar este recorte
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
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
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
      {children}
    </div>
  );
}

function Numero({ valor, cor }: { valor: number; cor: string }) {
  return (
    <span
      style={{
        textAlign: 'right',
        font: 'var(--text-amount)',
        letterSpacing: 'var(--tracking-amount)',
        fontVariantNumeric: 'tabular-nums',
        color: cor,
      }}
    >
      {formatarValor(valor)}
    </span>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      style={{
        font: 'var(--text-small)',
        padding: '7px 13px',
        minHeight: 36,
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        border: `1px solid ${ativo ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        background: ativo ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        color: ativo ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

function CampoDeMes({ rotulo, valor, onMudar }: { rotulo: string; valor: string; onMudar: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...rotuloLabel, marginBottom: 7 }}>{rotulo}</span>
      <input
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder="03/2026"
        style={{
          minHeight: 'var(--target-office)',
          border: '1px solid var(--color-line-strong)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '10px 13px',
          font: 'var(--text-body)',
          color: 'var(--text-primary)',
          outline: 'none',
          width: 140,
        }}
      />
    </label>
  );
}
