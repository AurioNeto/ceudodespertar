import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { OperacaoAuditada, RegistroDeAcesso, RegistroDeAuditoria } from '@cdd/contracts';
import { EmptyState, Icon, ScreenHeader, StatusBadge } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { Cartao, Numero, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarData, pluralizar } from '../../lib/formato';
import { hoje } from '../../mocks/sessao';
import {
  acessos,
  autoresDaTrilha,
  CONTEXTO_ROTULO,
  EXIGE_REGISTRO_EXTRA,
  FEICAO,
  trilha,
} from '../../mocks/auditoria';

/**
 * `A-04` · Auditoria — Doc 4 §9 e Doc 3 §10.4.
 *
 * Duas visões, e a segunda é a razão de a tela existir cedo: o log de acesso a
 * dado sensível é o contrapeso ao poder do Acolhimento sobre a anamnese. Quem
 * pode ler tudo precisa ser visto lendo.
 *
 * O que a tela nunca mostra é o conteúdo lido. O log diz que houve leitura, de
 * quem e quando — o dado de saúde continua morando num lugar só.
 */

type Visao = 'trilha' | 'acesso';
type Agrupamento = 'leitor' | 'pessoa';

const TODOS = '__todos__';

/** `2026-09-02T09:58:00-03:00` → `09:58`. As fixtures já vêm no fuso da casa. */
const hora = (em: string): string => em.slice(11, 16);
const dia = (em: string): string => em.slice(0, 10);

const MS_MINUTO = 60_000;

function rotularDia(iso: string): string {
  if (iso === hoje) return 'hoje';
  const anterior = new Date(new Date(`${hoje}T12:00:00`).getTime() - 24 * 60 * MS_MINUTO);
  const ontem = anterior.toISOString().slice(0, 10);
  if (iso === ontem) return 'ontem';
  return formatarData(iso);
}

export function AuditoriaPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const [visao, setVisao] = useState<Visao>('trilha');

  return (
    <>
      <ScreenHeader
        code={campo ? 'A-04' : 'A-04 · Auditoria'}
        title="Auditoria"
        subtitle={campo ? undefined : 'A trilha das operações e o log de leitura de dado sensível · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1100,
          minWidth: 0,
        }}
      >
        <SeletorDeTipo
          opcoes={[
            { valor: 'trilha', label: 'Trilha de operações' },
            { valor: 'acesso', label: 'Acesso a dado sensível' },
          ]}
          valor={visao}
          onEscolher={setVisao}
          densidade={densidade}
        />

        {visao === 'trilha' ? <Trilha campo={campo} /> : <Acesso campo={campo} />}
      </div>
    </>
  );
}

/* ── Visão 1 · trilha geral ──────────────────────────────────────────────── */

function Trilha({ campo }: { campo: boolean }) {
  const [operacao, setOperacao] = useState<string>(TODOS);
  const [autor, setAutor] = useState<string>(TODOS);

  const autores = useMemo(() => autoresDaTrilha(trilha), []);

  const operacoesPresentes = useMemo(
    () => [...new Set(trilha.map((r) => r.operacao))].sort((a, b) => FEICAO[a].rotulo.localeCompare(FEICAO[b].rotulo, 'pt-BR')),
    [],
  );

  const filtrada = trilha.filter(
    (r) => (operacao === TODOS || r.operacao === operacao) && (autor === TODOS || r.autorNome === autor),
  );

  const porDia = useMemo(() => {
    const mapa = new Map<string, RegistroDeAuditoria[]>();
    for (const r of filtrada) {
      const chave = dia(r.em);
      const lista = mapa.get(chave);
      if (lista) lista.push(r);
      else mapa.set(chave, [r]);
    }
    return [...mapa.entries()];
  }, [filtrada]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      <NotaDeImutabilidade />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr) auto',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <Select
          label="Operação"
          value={operacao}
          onChange={setOperacao}
          options={[
            { value: TODOS, label: 'Todas as operações' },
            ...operacoesPresentes.map((o) => ({ value: o, label: FEICAO[o].rotulo })),
          ]}
        />
        <Select
          label="Quem fez"
          value={autor}
          onChange={setAutor}
          options={[{ value: TODOS, label: 'Qualquer pessoa' }, ...autores.map((a) => ({ value: a, label: a }))]}
        />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', paddingBottom: 11 }}>
          {pluralizar(filtrada.length, 'registro')}
          {filtrada.length === trilha.length ? '' : ` de ${trilha.length}`}
        </span>
      </div>

      {porDia.length === 0 ? (
        <EmptyState
          title="Nada com esse recorte"
          description="A trilha não tem lacuna: se não há registro aqui, é o filtro que está estreito demais."
        />
      ) : (
        porDia.map(([data, registros]) => (
          <div key={data} style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <Rotulo>{rotularDia(data)}</Rotulo>
              <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
            </div>
            {registros.map((r) => (
              <LinhaDaTrilha key={r.id} registro={r} campo={campo} />
            ))}
          </div>
        ))
      )}

      <RodapeDaTrilha />
    </div>
  );
}

function NotaDeImutabilidade() {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '13px 16px',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="scroll-text" size={18} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        A trilha <b>só cresce</b>. Não há edição, não há exclusão e não há linha que não tenha autor e instante — nem
        para quem administra o sistema. Uma trilha que se pode apagar não serve para a conversa que ela existe para
        sustentar.
      </p>
    </div>
  );
}

function LinhaDaTrilha({ registro: r, campo }: { registro: RegistroDeAuditoria; campo: boolean }) {
  const feicao = FEICAO[r.operacao];
  const exigencia = EXIGE_REGISTRO_EXTRA[r.operacao];

  const cor =
    feicao.tom === 'atencao'
      ? 'var(--color-attention)'
      : feicao.tom === 'sensivel'
        ? 'var(--color-suggest)'
        : 'var(--color-royal)';

  const fundo =
    feicao.tom === 'atencao'
      ? 'var(--color-attention-soft)'
      : feicao.tom === 'sensivel'
        ? 'var(--color-suggest-soft)'
        : 'var(--bg-sunken)';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: feicao.tom === 'neutro' ? undefined : `var(--edge-state) solid ${cor}`,
        borderRadius: feicao.tom === 'neutro' ? 'var(--radius)' : '0 var(--radius) var(--radius) 0',
        padding: campo ? '12px 14px' : '13px 16px',
        display: 'flex',
        gap: campo ? 11 : 13,
        minWidth: 0,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 32,
          height: 32,
          flexShrink: 0,
          borderRadius: 'var(--radius-pill)',
          background: fundo,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={feicao.icone} size={16} color={cor} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px 8px' }}>
          <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)' }}>
            {hora(r.em)}
          </span>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.autorNome}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>· {r.autorGrupo}</span>
        </div>

        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          {feicao.verbo} <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.alvo}</b>
        </span>

        {r.detalhes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 1 }}>
            {r.detalhes.map((d) => (
              <span key={d.rotulo} style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-field-label)' }}>{d.rotulo}: </span>
                {d.anterior ? (
                  <>
                    <s style={{ color: 'var(--text-meta)' }}>{d.anterior}</s>
                    <span style={{ color: 'var(--text-meta)' }}> → </span>
                    <b style={{ fontWeight: 500 }}>{d.valor}</b>
                  </>
                ) : (
                  d.valor
                )}
              </span>
            ))}
          </div>
        ) : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 8px', alignItems: 'center', marginTop: 2 }}>
          <StatusBadge tone={feicao.tom === 'atencao' ? 'attention' : feicao.tom === 'sensivel' ? 'suggest' : 'neutral'}>
            {feicao.rotulo}
          </StatusBadge>
          {r.referencia ? <code style={{ font: 'var(--text-code)' }}>{r.referencia}</code> : null}
          {exigencia && r.detalhes.length === 0 ? (
            <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
              registro extra ausente — o domínio exige {exigencia}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RodapeDaTrilha() {
  const itens = Object.entries(EXIGE_REGISTRO_EXTRA) as [OperacaoAuditada, string][];
  return (
    <Cartao style={{ gap: 10 }}>
      <Rotulo>O que o domínio exige guardar além de autor e instante</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map(([op, exigencia]) => (
          <span key={op} style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{FEICAO[op].rotulo}</b> — {exigencia}
          </span>
        ))}
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
        Sem o registro extra a operação não acontece: o motivo do estorno e o da reabertura são campo obrigatório do
        comando, não anotação posterior.
      </span>
    </Cartao>
  );
}

/* ── Visão 2 · acesso a dado sensível ────────────────────────────────────── */

function Acesso({ campo }: { campo: boolean }) {
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('leitor');

  const leitores = new Set(acessos.map((a) => a.leitorNome)).size;
  const pessoas = new Set(acessos.map((a) => a.pessoaNome)).size;
  const semContexto = acessos.filter((a) => a.contexto === null).length;

  const grupos = useMemo(() => agruparAcessos(acessos, agrupamento), [agrupamento]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      <ContrapesoDaGovernanca />

      <Cartao campo={campo}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: campo ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
            gap: campo ? 14 : 20,
          }}
        >
          <Numero rotulo="Leituras no período" valor={String(acessos.length)} nota="últimos 30 dias" destaque />
          <Numero rotulo="Quem leu" valor={String(leitores)} nota="pessoas com a permissão" />
          <Numero rotulo="Anamneses tocadas" valor={String(pessoas)} nota="pessoas diferentes" />
          <Numero
            rotulo="Sem contexto vinculado"
            valor={String(semContexto)}
            nota="leitura fora de percurso"
            cor={semContexto > 0 ? 'var(--color-pending)' : undefined}
          />
        </div>
      </Cartao>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <SeletorDeTipo
          opcoes={[
            { valor: 'leitor', label: 'Por quem leu' },
            { valor: 'pessoa', label: 'Por quem foi lido' },
          ]}
          valor={agrupamento}
          onEscolher={setAgrupamento}
          densidade={campo ? 'field' : 'office'}
        />
      </div>

      {grupos.map((g) => (
        <GrupoDeAcessos key={g.chave} grupo={g} agrupamento={agrupamento} campo={campo} />
      ))}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
        O log diz que houve leitura, de quem e quando. <b>Não diz o que foi lido</b> — o conteúdo da anamnese mora num
        lugar só, e chegar até ele gera mais uma linha aqui.
      </span>
    </div>
  );
}

function ContrapesoDaGovernanca() {
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderLeft: 'var(--edge-state) solid var(--color-suggest)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="eye" size={20} color="var(--color-suggest)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Não há leitura silenciosa</div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Toda vez que alguém abre uma anamnese, o sistema registra — a regra é do domínio, não da tela, e não existe
          caminho que a contorne. A Governança lê este log porque o Acolhimento tem acesso a dado de saúde da casa
          inteira, e um poder desses precisa de alguém olhando.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-suggest)' }}>
          Simétrico: consultar este log também vira linha na trilha geral.
        </p>
      </div>
    </div>
  );
}

interface GrupoDeAcesso {
  chave: string;
  titulo: string;
  legenda: string;
  registros: readonly RegistroDeAcesso[];
}

function agruparAcessos(lista: readonly RegistroDeAcesso[], por: Agrupamento): readonly GrupoDeAcesso[] {
  const mapa = new Map<string, RegistroDeAcesso[]>();
  for (const a of lista) {
    const chave = por === 'leitor' ? a.leitorNome : a.pessoaNome;
    const atual = mapa.get(chave);
    if (atual) atual.push(a);
    else mapa.set(chave, [a]);
  }
  return [...mapa.entries()]
    .map(([chave, registros]) => ({
      chave,
      titulo: chave,
      legenda: por === 'leitor' ? (registros[0]?.leitorGrupo ?? '') : `${new Set(registros.map((r) => r.leitorNome)).size} leitor(es)`,
      registros,
    }))
    .sort((a, b) => b.registros.length - a.registros.length);
}

/**
 * Rajada: três ou mais leituras dentro de quinze minutos. Não é irregularidade
 * — revisar a fila é trabalho legítimo. É o tipo de padrão que a Governança
 * quer enxergar sem ter que contar linha a linha.
 */
function rajada(registros: readonly RegistroDeAcesso[]): { leituras: number; minutos: number } | null {
  const instantes = registros.map((r) => new Date(r.em).getTime()).sort((a, b) => a - b);
  let melhor: { leituras: number; minutos: number } | null = null;
  for (let i = 0; i < instantes.length; i += 1) {
    let j = i;
    while (j + 1 < instantes.length && instantes[j + 1]! - instantes[i]! <= 15 * MS_MINUTO) j += 1;
    const leituras = j - i + 1;
    if (leituras >= 3 && (melhor === null || leituras > melhor.leituras)) {
      melhor = { leituras, minutos: Math.max(1, Math.round((instantes[j]! - instantes[i]!) / MS_MINUTO)) };
    }
  }
  return melhor;
}

function GrupoDeAcessos({
  grupo,
  agrupamento,
  campo,
}: {
  grupo: GrupoDeAcesso;
  agrupamento: Agrupamento;
  campo: boolean;
}) {
  const emRajada = agrupamento === 'leitor' ? rajada(grupo.registros) : null;
  const semContexto = grupo.registros.filter((r) => r.contexto === null).length;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <Icon
          name={agrupamento === 'leitor' ? 'user-round' : 'clipboard-list'}
          size={17}
          color="var(--color-ink-brand)"
        />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{grupo.titulo}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>· {grupo.legenda}</span>
        <span style={{ flex: 1 }} />
        <StatusBadge tone="neutral">{pluralizar(grupo.registros.length, 'leitura')}</StatusBadge>
        {semContexto > 0 ? <StatusBadge tone="pending">{semContexto} sem contexto</StatusBadge> : null}
      </div>

      {emRajada ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {pluralizar(emRajada.leituras, 'leitura')} em {pluralizar(emRajada.minutos, 'minuto')} — padrão de revisão de
          fila. Fica visível para virar pergunta, não acusação.
        </span>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {grupo.registros.map((r, i) => (
          <LinhaDeAcesso key={r.id} registro={r} agrupamento={agrupamento} primeira={i === 0} />
        ))}
      </div>
    </Cartao>
  );
}

function LinhaDeAcesso({
  registro: r,
  agrupamento,
  primeira,
}: {
  registro: RegistroDeAcesso;
  agrupamento: Agrupamento;
  primeira: boolean;
}) {
  const outro = agrupamento === 'leitor' ? r.pessoaNome : `${r.leitorNome} · ${r.leitorGrupo}`;
  const estilo: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
    alignItems: 'baseline',
    padding: '9px 0',
    borderTop: primeira ? undefined : '1px solid var(--color-line)',
  };

  return (
    <div style={estilo}>
      <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)', minWidth: 108 }}>
        {formatarData(dia(r.em))} {hora(r.em)}
      </span>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 160 }}>{outro}</span>
      {r.contexto ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 2, minWidth: 200 }}>
          <span style={{ color: 'var(--text-field-label)' }}>{CONTEXTO_ROTULO[r.contexto.tipo]} · </span>
          {r.contexto.descricao}
        </span>
      ) : (
        <span
          style={{
            font: 'var(--text-small)',
            color: 'var(--color-pending)',
            flex: 2,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="message-circle-question" size={14} color="var(--color-pending)" />
          Sem contexto vinculado — leitura direta na ficha
        </span>
      )}
    </div>
  );
}
