import { useState } from 'react';
import type { CategoriaId, RegimeDaUnidade } from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { Cartao, Recado, Rotulo, Td, Th } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarDinheiro, pluralizar } from '../../lib/formato';
import {
  categorias as categoriasIniciais,
  LINHAS_DE_RELATORIO,
  parametrosDaCasa,
  unidades,
  type CategoriaDoPlano,
  type UnidadeDoPlano,
} from '../../mocks/parametros';

type Aba = 'categorias' | 'unidades' | 'casa';

const REGIME_ROTULO: Record<RegimeDaUnidade, string> = {
  CONTRIBUICAO: 'Contribuição',
  COMERCIAL: 'Comercial',
};

export function ParametrosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [aba, setAba] = useState<Aba>('categorias');
  const [categorias, setCategorias] = useState<readonly CategoriaDoPlano[]>(categoriasIniciais);
  const [editando, setEditando] = useState<CategoriaId | null>(null);
  const [linhaEscolhida, setLinhaEscolhida] = useState(LINHAS_DE_RELATORIO[0]!);
  const [recado, setRecado] = useState<string | null>(null);

  const semLinha = categorias.filter((c) => c.ativa && !c.linhaRelatorio);
  const semRegime = unidades.filter((u) => u.ativa && u.regime === null);

  const corrigir = (c: CategoriaDoPlano) => {
    setCategorias((lista) =>
      lista.map((x) => (x.id === c.id ? { ...x, linhaRelatorio: linhaEscolhida } : x)),
    );
    setEditando(null);
    setRecado(
      `“${c.nome}” agora aparece em ${linhaEscolhida}. ${pluralizar(c.lancamentos, 'lançamento')} que estavam fora do relatório entraram.`,
    );
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-15 · F-16 · A-03' : 'F-15, F-16 e A-03 · Parâmetros'}
        title="Parâmetros"
        subtitle={campo ? undefined : 'Plano de contas, unidades e o que a casa configura · CDD'}
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
        <SeletorDeTipo
          opcoes={[
            { valor: 'categorias', label: 'Categorias' },
            { valor: 'unidades', label: 'Unidades e regimes' },
            { valor: 'casa', label: 'Instituição' },
          ]}
          valor={aba}
          onEscolher={(v) => {
            setAba(v);
            setEditando(null);
            setRecado(null);
          }}
          densidade={densidade}
        />

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {aba === 'categorias' ? (
          <>
            {semLinha.length > 0 ? (
              <BuracoDoRelatorio quantidade={semLinha.length} lancamentos={semLinha.reduce((s, c) => s + c.lancamentos, 0)} />
            ) : (
              <div
                style={{
                  background: 'var(--color-confirmed-soft)',
                  border: '1px solid var(--color-confirmed-border)',
                  borderRadius: 'var(--radius)',
                  padding: '13px 16px',
                  display: 'flex',
                  gap: 11,
                  alignItems: 'center',
                }}
              >
                <Icon name="circle-check" size={18} color="var(--color-confirmed)" />
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
                  Toda categoria ativa tem linha de relatório. Nada fica fora do DRE.
                </span>
              </div>
            )}

            <TabelaDeCategorias
              categorias={categorias}
              campo={campo}
              editando={editando}
              linhaEscolhida={linhaEscolhida}
              onLinha={setLinhaEscolhida}
              onEditar={(c) => {
                setEditando(c.id);
                setLinhaEscolhida(c.linhaRelatorio ?? LINHAS_DE_RELATORIO[0]!);
              }}
              onCancelar={() => setEditando(null)}
              onCorrigir={corrigir}
            />
          </>
        ) : null}

        {aba === 'unidades' ? (
          <>
            {semRegime.length > 0 ? (
              <div
                style={{
                  background: 'var(--color-pending-soft)',
                  border: '1px solid var(--color-pending-border)',
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: 12,
                }}
              >
                <Icon name="message-circle-question" size={19} color="var(--color-pending)" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                    {pluralizar(semRegime.length, 'unidade')} sem regime definido
                  </div>
                  <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '70ch' }}>
                    O regime governa o vocabulário da tela, quais categorias a unidade aceita e se a receita gera
                    obrigação fiscal. É decisão da coordenação, não do sistema — e trava o seed das unidades.
                  </p>
                </div>
              </div>
            ) : null}
            <ListaDeUnidades campo={campo} />
          </>
        ) : null}

        {aba === 'casa' ? <ParametrosDaCasa campo={campo} /> : null}
      </div>
    </>
  );
}

function BuracoDoRelatorio({ quantidade, lancamentos }: { quantidade: number; lancamentos: number }) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="triangle-alert" size={20} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {pluralizar(quantidade, 'categoria ativa sem linha de relatório', 'categorias ativas sem linha de relatório')}
        </div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
          {pluralizar(lancamentos, 'lançamento')} não aparecem no DRE — e isso não é sinalizado como erro em lugar
          nenhum. Foi assim que R$ 40,6 mil ficaram órfãos na planilha: não estavam errados, estavam fora.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          Escolher a linha resolve. É a razão de esta tela existir.
        </p>
      </div>
    </div>
  );
}

function TabelaDeCategorias({
  categorias,
  campo,
  editando,
  linhaEscolhida,
  onLinha,
  onEditar,
  onCancelar,
  onCorrigir,
}: {
  categorias: readonly CategoriaDoPlano[];
  campo: boolean;
  editando: CategoriaId | null;
  linhaEscolhida: string;
  onLinha: (v: string) => void;
  onEditar: (c: CategoriaDoPlano) => void;
  onCancelar: () => void;
  onCorrigir: (c: CategoriaDoPlano) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
      <Rotulo>{pluralizar(categorias.length, 'categoria')} no plano de contas</Rotulo>

      <div
        style={{
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-card)',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)', minWidth: campo ? 620 : 860 }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              <Th>Categoria</Th>
              <Th>Natureza</Th>
              <Th>Tipo</Th>
              <Th>Regimes</Th>
              <Th>Linha de relatório</Th>
              <Th alinharDireita>Lançamentos</Th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => {
              const faltando = c.ativa && !c.linhaRelatorio;
              const emEdicao = editando === c.id;
              return (
                <tr
                  key={c.id}
                  style={{
                    borderTop: '1px solid var(--color-line)',
                    background: faltando ? 'var(--color-attention-soft)' : undefined,
                    opacity: c.ativa ? 1 : 0.58,
                  }}
                >
                  <Td>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{c.nome}</span>
                        {c.ativa ? null : <StatusBadge tone="neutral">Inativa</StatusBadge>}
                      </span>
                      <code style={{ font: 'var(--text-code)' }}>{c.codigoSistema}</code>
                      {c.nota ? (
                        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '52ch' }}>{c.nota}</span>
                      ) : null}
                    </span>
                  </Td>
                  <Td>
                    <span
                      style={{
                        font: 'var(--text-body)',
                        color: c.natureza === 'RECEITA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
                      }}
                    >
                      {c.natureza === 'RECEITA' ? 'Receita' : 'Despesa'}
                    </span>
                  </Td>
                  <Td>{c.tipo.charAt(0) + c.tipo.slice(1).toLowerCase()}</Td>
                  <Td>
                    <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {c.regimesPermitidos.map((r) => (
                        <span
                          key={r}
                          style={{
                            font: 'var(--text-small)',
                            background: 'var(--bg-sunken)',
                            border: '1px solid var(--color-line)',
                            borderRadius: 'var(--radius-pill)',
                            padding: '2px 9px',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {REGIME_ROTULO[r]}
                        </span>
                      ))}
                    </span>
                  </Td>
                  <Td>
                    {emEdicao ? (
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 220 }}>
                        <Select
                          label="Linha de relatório"
                          value={linhaEscolhida}
                          options={LINHAS_DE_RELATORIO.map((l) => ({ value: l, label: l }))}
                          onChange={onLinha}
                        />
                        <span style={{ display: 'flex', gap: 7 }}>
                          <Button iconName="check" onClick={() => onCorrigir(c)}>
                            Salvar
                          </Button>
                          <Button variant="quiet" onClick={onCancelar}>
                            Cancelar
                          </Button>
                        </span>
                      </span>
                    ) : c.linhaRelatorio ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--text-primary)' }}>{c.linhaRelatorio}</span>
                        {c.ativa ? (
                          <button
                            type="button"
                            onClick={() => onEditar(c)}
                            aria-label={`trocar a linha de ${c.nome}`}
                            style={{ color: 'var(--text-link)', cursor: 'pointer', font: 'var(--text-small)' }}
                          >
                            trocar
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <StatusBadge tone="attention">Faltando</StatusBadge>
                        <Button variant="ghost" iconName="pencil" onClick={() => onEditar(c)}>
                          Escolher linha
                        </Button>
                      </span>
                    )}
                  </Td>
                  <Td alinharDireita>
                    <span data-numeric style={{ color: 'var(--text-secondary)' }}>
                      {c.lancamentos}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          <b>Natureza não muda</b> depois de criada: uma categoria não troca de lado. Se precisa dos dois, são duas
          categorias — é por isso que cachê pago e cachê recebido existem separados.
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Categoria com lançamento confirmado <b>não se exclui</b>, só se inativa.
        </span>
      </div>
    </div>
  );
}

function ListaDeUnidades({ campo }: { campo: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {unidades.map((u) => (
        <UnidadeCartao key={u.id} unidade={u} campo={campo} />
      ))}
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Unidade é <b>centro de custo</b>, não fronteira de segurança. Quem isola dados é a instituição; a unidade só
        organiza o relatório e decide o vocabulário da tela.
      </span>
    </div>
  );
}

function UnidadeCartao({ unidade: u, campo }: { unidade: UnidadeDoPlano; campo: boolean }) {
  const semRegime = u.regime === null;
  const proporcao = u.tetoFaturamentoAnual && u.faturamentoNoAno ? u.faturamentoNoAno / u.tetoFaturamentoAnual : null;

  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{u.nome}</span>
        <code style={{ font: 'var(--text-code)' }}>{u.codigoSistema}</code>
        {semRegime ? (
          <StatusBadge tone="pending">Regime a confirmar</StatusBadge>
        ) : (
          <StatusBadge tone={u.regime === 'COMERCIAL' ? 'royal' : 'confirmed'}>{REGIME_ROTULO[u.regime!]}</StatusBadge>
        )}
        {u.documentoFiscal ? (
          <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            CNPJ {u.documentoFiscal}
          </span>
        ) : null}
      </div>

      {u.nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{u.nota}</span> : null}

      {u.tetoFaturamentoAnual && u.faturamentoNoAno ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Faturamento no ano contra o teto do regime
            </span>
            <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
              {formatarDinheiro(u.faturamentoNoAno)} de {formatarDinheiro(u.tetoFaturamentoAnual)}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (proporcao ?? 0) * 100)}%`,
                height: '100%',
                background: (proporcao ?? 0) > 0.8 ? 'var(--color-pending)' : 'var(--color-royal)',
              }}
            />
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            O teto é parâmetro da unidade, nunca constante no código — esse valor muda por lei.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}

function ParametrosDaCasa({ campo }: { campo: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {parametrosDaCasa.map((p) => (
        <Cartao key={p.chave} campo={campo} style={{ gap: 9 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline' }}>
            <span style={{ flex: 1, minWidth: 200, font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
              {p.rotulo}
            </span>
            <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
              {p.valor}
            </span>
            {p.editavel ? (
              <Button variant="quiet" iconName="pencil">
                Editar
              </Button>
            ) : (
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>fixo</span>
            )}
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>{p.nota}</span>
        </Cartao>
      ))}
    </div>
  );
}
