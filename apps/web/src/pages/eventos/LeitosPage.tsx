import { useMemo, useState } from 'react';
import type { Dormitorio, Leito } from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge, TextField } from '../../ds';
import { Select, SeletorDeTipo } from '../../components/Campo';
import { Cartao, Numero, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { pluralizar } from '../../lib/formato';
import {
  alocacaoInicial,
  conflitoDeAgenda,
  dormitorios as dormitoriosIniciais,
  eventoDoMapa,
  foraDoMapa,
  hospedes,
  liberadoPorCancelamento,
  TIPO_LEITO_ROTULO,
  type NoiteId,
} from '../../mocks/leitos';

/**
 * `E-10` · Mapa de leitos e `E-15` · Cadastro — Doc 4 §7 e Doc 2 §2.6.
 *
 * Duas telas do Doc num lugar só porque quem aloca é quem sabe quantos leitos
 * existem, e ir e voltar entre telas para descobrir que falta um beliche é o
 * tipo de atrito que faz a operação voltar para o papel.
 *
 * A grade é dormitório × noite. Três invariantes são estruturais — leito
 * ocupado não é alvo (ML1), só entra quem pediu hospedagem (ML2), noite fora
 * do evento não tem coluna (ML4) — e o quarto, ML3, já aconteceu antes de a
 * tela abrir: cancelar inscrição libera o leito sozinho.
 *
 * O que **não** é invariante é o conflito com outro evento no mesmo local. O
 * agregado é por evento, e checar isso exigiria um agregado de ocupação global
 * que viraria ponto de contenção. Vira aviso — e é responsabilidade da tela
 * que o aviso seja impossível de não ver.
 */

type Aba = 'mapa' | 'cadastro';

/** `leitoId → noiteId → inscricaoId`. */
type Alocacao = Record<string, Record<string, string>>;

export function LeitosPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [aba, setAba] = useState<Aba>('mapa');
  const [dormitorios, setDormitorios] = useState<readonly Dormitorio[]>(dormitoriosIniciais);
  const [alocacao, setAlocacao] = useState<Alocacao>(
    () => JSON.parse(JSON.stringify(alocacaoInicial)) as Alocacao,
  );
  const [escolhendo, setEscolhendo] = useState<{ leitoId: string; noite: NoiteId } | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const ocupadoPor = (leitoId: string, noite: string) => alocacao[leitoId]?.[noite];

  /** Quantas noites cada pessoa ainda precisa. */
  const pendencias = useMemo(
    () =>
      hospedes.map((h) => {
        const alocadas = h.noites.filter((n) =>
          Object.entries(alocacao).some(([, noites]) => noites[n] === (h.inscricaoId as string)),
        );
        return { hospede: h, faltam: h.noites.filter((n) => !alocadas.includes(n)) };
      }),
    [alocacao],
  );

  const semLeito = pendencias.filter((p) => p.faltam.length > 0);

  const leitosAtivos = dormitorios.flatMap((d) => d.leitos.filter((l) => l.ativo));
  const vagas = leitosAtivos.length * eventoDoMapa.noites.length;
  const ocupadas = Object.values(alocacao).reduce((s, n) => s + Object.keys(n).length, 0);

  const alocar = (leitoId: string, noite: NoiteId, inscricaoId: string, nome: string) => {
    setAlocacao((a) => ({ ...a, [leitoId]: { ...(a[leitoId] ?? {}), [noite]: inscricaoId } }));
    setEscolhendo(null);
    const emConflito = noite === conflitoDeAgenda.noite;
    setRecado(
      emConflito
        ? `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}. Atenção: o ${conflitoDeAgenda.evento} usa o mesmo local nessa noite, e o sistema não impede a sobreposição — confirme com quem organiza.`
        : `${nome} alocada em ${identificacaoDe(dormitorios, leitoId)} na ${rotuloDaNoite(noite)}.`,
    );
  };

  const liberar = (leitoId: string, noite: string) => {
    setAlocacao((a) => {
      const noites = { ...(a[leitoId] ?? {}) };
      delete noites[noite];
      return { ...a, [leitoId]: noites };
    });
    setRecado(null);
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-10 · E-15' : 'E-10 e E-15 · Leitos'}
        title="Leitos"
        subtitle={campo ? undefined : `${eventoDoMapa.nome} · ${eventoDoMapa.periodo} · ${eventoDoMapa.local}`}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 26px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 1060,
          minWidth: 0,
        }}
      >
        <SeletorDeTipo
          opcoes={[
            { valor: 'mapa', label: 'Mapa do evento' },
            { valor: 'cadastro', label: 'Dormitórios e leitos' },
          ]}
          valor={aba}
          onEscolher={(v) => {
            setAba(v);
            setEscolhendo(null);
            setRecado(null);
          }}
          densidade={densidade}
        />

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {aba === 'mapa' ? (
          <>
            <AvisoDeConflito />

            <Cartao campo={campo}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: campo ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))',
                  gap: campo ? 14 : 20,
                }}
              >
                <Numero rotulo="Vagas-noite ocupadas" valor={`${ocupadas} de ${vagas}`} nota={`${leitosAtivos.length} leitos ativos × ${eventoDoMapa.noites.length} noites`} destaque />
                <Numero
                  rotulo="Ainda sem leito"
                  valor={String(semLeito.length)}
                  nota="pessoas que pediram beliche ou quarto"
                  cor={semLeito.length > 0 ? 'var(--color-pending)' : undefined}
                />
                <Numero rotulo="Dormem na igreja" valor={String(foraDoMapa.filter((x) => x.hospedagem === 'COLCHONETE').length)} nota="colchonete próprio, fora do mapa" />
              </div>
            </Cartao>

            <Grade
              dormitorios={dormitorios}
              campo={campo}
              ocupadoPor={ocupadoPor}
              escolhendo={escolhendo}
              onEscolher={(leitoId, noite) => {
                setEscolhendo({ leitoId, noite });
                setRecado(null);
              }}
              onFechar={() => setEscolhendo(null)}
              onLiberar={liberar}
              onAlocar={alocar}
              pendencias={pendencias}
            />

            <SemLeito lista={semLeito} campo={campo} />

            <ForaDoMapa campo={campo} />
          </>
        ) : (
          <Cadastro
            dormitorios={dormitorios}
            onMudar={setDormitorios}
            campo={campo}
            onRecado={setRecado}
            noitesOcupadas={(leitoId) => Object.keys(alocacao[leitoId] ?? {}).length}
          />
        )}
      </div>
    </>
  );
}

const rotuloDaNoite = (n: string) => eventoDoMapa.noites.find((x) => x.chave === n)?.rotulo ?? n;

const identificacaoDe = (dormitorios: readonly Dormitorio[], leitoId: string) =>
  dormitorios.flatMap((d) => d.leitos).find((l) => (l.id as string) === leitoId)?.identificacao ?? leitoId;

/* ── O aviso que o domínio não dá ────────────────────────────────────────── */

function AvisoDeConflito() {
  return (
    <div
      style={{
        background: 'var(--color-pending-soft)',
        border: '1px solid var(--color-pending-border)',
        borderLeft: 'var(--edge-state) solid var(--color-pending)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="triangle-alert" size={20} color="var(--color-pending)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          Outro evento usa o mesmo local na {rotuloDaNoite(conflitoDeAgenda.noite)}
        </div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
          <b>{conflitoDeAgenda.evento}</b>, em {conflitoDeAgenda.local}, ocupa cerca de{' '}
          {pluralizar(conflitoDeAgenda.leitosQueEleUsa, 'leito')} na mesma noite — e{' '}
          <b>o sistema não impede a sobreposição</b>. A conta de leitos é feita por evento, não pela casa inteira, e
          quem confere as duas agendas é gente.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-pending)' }}>
          As noites com conflito vêm marcadas na grade. Alocar continua permitido — só não continua silencioso.
        </p>
      </div>
    </div>
  );
}

/* ── A grade ─────────────────────────────────────────────────────────────── */

interface Pendencia {
  hospede: (typeof hospedes)[number];
  faltam: readonly NoiteId[];
}

function Grade({
  dormitorios,
  campo,
  ocupadoPor,
  escolhendo,
  onEscolher,
  onFechar,
  onLiberar,
  onAlocar,
  pendencias,
}: {
  dormitorios: readonly Dormitorio[];
  campo: boolean;
  ocupadoPor: (leitoId: string, noite: string) => string | undefined;
  escolhendo: { leitoId: string; noite: NoiteId } | null;
  onEscolher: (leitoId: string, noite: NoiteId) => void;
  onFechar: () => void;
  onLiberar: (leitoId: string, noite: string) => void;
  onAlocar: (leitoId: string, noite: NoiteId, inscricaoId: string, nome: string) => void;
  pendencias: readonly Pendencia[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      {dormitorios
        .filter((d) => d.ativo)
        .map((d) => (
          <Cartao key={d.id} campo={campo} style={{ gap: 11 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
              <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                {pluralizar(d.leitos.filter((l) => l.ativo).length, 'leito ativo', 'leitos ativos')}
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 300, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${eventoDoMapa.noites.length}, minmax(104px, 1fr))`, gap: 7 }}>
                  <span />
                  {eventoDoMapa.noites.map((n) => (
                    <span key={n.chave} style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                      <Rotulo>{n.curto}</Rotulo>
                      {n.chave === conflitoDeAgenda.noite ? (
                        <Icon name="triangle-alert" size={12} color="var(--color-pending)" />
                      ) : null}
                    </span>
                  ))}
                </div>

                {d.leitos.map((l) => (
                  <LinhaDeLeito
                    key={l.id}
                    leito={l}
                    campo={campo}
                    ocupadoPor={ocupadoPor}
                    escolhendo={escolhendo}
                    onEscolher={onEscolher}
                    onLiberar={onLiberar}
                  />
                ))}
              </div>
            </div>

            {escolhendo && d.leitos.some((l) => (l.id as string) === escolhendo.leitoId) ? (
              <EscolhaDeHospede
                leito={identificacaoDe(dormitorios, escolhendo.leitoId)}
                noite={escolhendo.noite}
                pendencias={pendencias}
                campo={campo}
                onFechar={onFechar}
                onAlocar={(inscricaoId, nome) => onAlocar(escolhendo.leitoId, escolhendo.noite, inscricaoId, nome)}
              />
            ) : null}
          </Cartao>
        ))}
    </div>
  );
}

function LinhaDeLeito({
  leito: l,
  campo,
  ocupadoPor,
  escolhendo,
  onEscolher,
  onLiberar,
}: {
  leito: Leito;
  campo: boolean;
  ocupadoPor: (leitoId: string, noite: string) => string | undefined;
  escolhendo: { leitoId: string; noite: NoiteId } | null;
  onEscolher: (leitoId: string, noite: NoiteId) => void;
  onLiberar: (leitoId: string, noite: string) => void;
}) {
  const leitoId = l.id as string;
  const liberado = liberadoPorCancelamento.leitoId === leitoId;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(96px, 1.1fr) repeat(${eventoDoMapa.noites.length}, minmax(104px, 1fr))`, gap: 7, alignItems: 'stretch' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', minWidth: 0, opacity: l.ativo ? 1 : 0.5 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{l.identificacao}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {l.ativo ? TIPO_LEITO_ROTULO[l.tipo] : 'inativo'}
        </span>
      </div>

      {eventoDoMapa.noites.map((n) => {
        const inscricaoId = ocupadoPor(leitoId, n.chave);
        const nome = hospedes.find((h) => (h.inscricaoId as string) === inscricaoId)?.nome;
        const conflita = n.chave === conflitoDeAgenda.noite;
        const selecionada = escolhendo?.leitoId === leitoId && escolhendo.noite === n.chave;

        if (!l.ativo) {
          return (
            <div
              key={n.chave}
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--color-line)',
                background: 'var(--bg-sunken)',
                minHeight: campo ? 52 : 48,
              }}
            />
          );
        }

        if (nome) {
          return (
            <button
              key={n.chave}
              type="button"
              aria-label={`liberar ${l.identificacao} na ${n.rotulo} — ${nome}`}
              onClick={() => onLiberar(leitoId, n.chave)}
              style={{
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${conflita ? 'var(--color-pending)' : 'var(--color-royal)'}`,
                background: 'var(--color-royal-soft)',
                color: 'var(--color-royal-ink)',
                minHeight: campo ? 52 : 48,
                padding: '6px 9px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 2,
                textAlign: 'left',
              }}
            >
              <span style={{ font: 'var(--text-small)', fontWeight: 600 }}>{nome.split(' ')[0]}</span>
              <span style={{ font: 'var(--text-small)', opacity: 0.7 }}>{nome.split(' ').slice(1).join(' ')}</span>
            </button>
          );
        }

        return (
          <button
            key={n.chave}
            type="button"
            aria-label={`alocar em ${l.identificacao} na ${n.rotulo}`}
            onClick={() => onEscolher(leitoId, n.chave)}
            style={{
              borderRadius: 'var(--radius-sm)',
              border: `1px ${selecionada ? 'solid' : 'dashed'} ${
                selecionada ? 'var(--color-royal)' : conflita ? 'var(--color-pending)' : 'var(--color-line-strong)'
              }`,
              background: selecionada ? 'var(--color-royal-soft)' : conflita ? 'var(--color-pending-soft)' : 'var(--bg-card)',
              minHeight: campo ? 52 : 48,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 6px',
            }}
          >
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>livre</span>
            {liberado && n.chave === eventoDoMapa.noites[0].chave ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)', textAlign: 'center' }}>
                liberado em {liberadoPorCancelamento.quando}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function EscolhaDeHospede({
  leito,
  noite,
  pendencias,
  campo,
  onFechar,
  onAlocar,
}: {
  leito: string;
  noite: NoiteId;
  pendencias: readonly Pendencia[];
  campo: boolean;
  onFechar: () => void;
  onAlocar: (inscricaoId: string, nome: string) => void;
}) {
  const candidatos = pendencias.filter((p) => p.faltam.includes(noite));

  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: campo ? '14px 15px' : '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>
          Quem dorme em {leito} na {rotuloDaNoite(noite)}
        </Rotulo>
        <span style={{ flex: 1 }} />
        <Button variant="quiet" onClick={onFechar}>
          Fechar
        </Button>
      </div>

      {candidatos.length === 0 ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ninguém sem leito nesta noite. Quem pediu hospedagem já está alocado.
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidatos.map(({ hospede: h }) => (
            <button
              key={h.inscricaoId}
              type="button"
              onClick={() => onAlocar(h.inscricaoId as string, h.nome)}
              style={{
                textAlign: 'left',
                border: 'var(--border-hairline)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
                padding: campo ? '13px 14px' : '11px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                minHeight: campo ? 'var(--target-field)' : undefined,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{h.nome}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                  {h.hospedagem === 'QUARTO' ? 'Pediu quarto' : 'Pediu beliche'} ·{' '}
                  {pluralizar(h.noites.length, 'noite')}
                  {h.observacao ? ` · ${h.observacao}` : ''}
                </span>
              </span>
              <Icon name="chevron-right" size={17} color="var(--text-meta)" />
            </button>
          ))}
        </div>
      )}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '74ch' }}>
        Só aparece quem pediu hospedagem nesta inscrição. Quem vai de colchonete ou vai embora depois do trabalho não
        entra no mapa — não é esquecimento, é que não ocupa leito.
      </span>
    </div>
  );
}

function SemLeito({ lista, campo }: { lista: readonly Pendencia[]; campo: boolean }) {
  if (lista.length === 0) {
    return (
      <Cartao campo={campo} style={{ gap: 8 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="circle-check" size={19} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Todo mundo com leito</span>
        </div>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Ninguém que pediu hospedagem ficou de fora. Inscrição com leito pendente não confirma.
        </span>
      </Cartao>
    );
  }

  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
        <Rotulo>Ainda sem leito</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--color-pending)' }}>
          {pluralizar(lista.length, 'pessoa')} — e inscrição com leito pendente não confirma
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {lista.map(({ hospede: h, faltam }, i) => (
          <div
            key={h.inscricaoId}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '9px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 150 }}>
              {h.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', flex: 1, minWidth: 170 }}>
              {h.hospedagem === 'QUARTO' ? 'quarto' : 'beliche'} · falta{faltam.length === 1 ? '' : 'm'}{' '}
              {faltam.map((n) => rotuloDaNoite(n)).join(' e ')}
            </span>
            {h.observacao ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--color-suggest)' }}>{h.observacao}</span>
            ) : null}
          </div>
        ))}
      </div>
    </Cartao>
  );
}

function ForaDoMapa({ campo }: { campo: boolean }) {
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <Rotulo>Dormem na casa e não ocupam leito</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Estão aqui porque a operação precisa contá-los — café da manhã, espaço no salão, quem está na chácara à noite
        —, e não estão na grade porque não há leito a alocar.
      </span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {foraDoMapa.map((x, i) => (
          <div
            key={x.nome}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '8px 0',
              borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 140 }}>
              {x.nome}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 2, minWidth: 200 }}>
              {x.razao}
            </span>
          </div>
        ))}
      </div>
    </Cartao>
  );
}

/* ── `E-15` · cadastro ───────────────────────────────────────────────────── */

function Cadastro({
  dormitorios,
  onMudar,
  campo,
  onRecado,
  noitesOcupadas,
}: {
  dormitorios: readonly Dormitorio[];
  onMudar: (d: readonly Dormitorio[]) => void;
  campo: boolean;
  onRecado: (r: string | null) => void;
  /** Quantas noites do evento aberto este leito já tem alocadas. */
  noitesOcupadas: (leitoId: string) => number;
}) {
  const [novoEm, setNovoEm] = useState<string | null>(null);
  const [identificacao, setIdentificacao] = useState('');
  const [tipo, setTipo] = useState<Leito['tipo']>('BELICHE_INFERIOR');

  const alternarAtivo = (dormitorioId: string, leitoId: string) => {
    onMudar(
      dormitorios.map((d) =>
        (d.id as string) === dormitorioId
          ? { ...d, leitos: d.leitos.map((l) => ((l.id as string) === leitoId ? { ...l, ativo: !l.ativo } : l)) }
          : d,
      ),
    );
    onRecado(null);
  };

  const acrescentar = (d: Dormitorio) => {
    if (!identificacao.trim()) return;
    const novo: Leito = {
      id: `l-novo-${Date.now()}` as Leito['id'],
      identificacao: identificacao.trim(),
      tipo,
      ativo: true,
    };
    onMudar(dormitorios.map((x) => (x.id === d.id ? { ...x, leitos: [...x.leitos, novo] } : x)));
    setNovoEm(null);
    setIdentificacao('');
    onRecado(`${novo.identificacao} acrescentado ao ${d.nome.toLowerCase()}. Já aparece no mapa do próximo evento.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16 }}>
      <QuestaoAberta />

      {dormitorios.map((d) => (
        <Cartao key={d.id} campo={campo} style={{ gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{d.nome}</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {pluralizar(d.leitos.filter((l) => l.ativo).length, 'leito ativo', 'leitos ativos')}
              {d.leitos.some((l) => !l.ativo)
                ? ` · ${pluralizar(d.leitos.filter((l) => !l.ativo).length, 'inativo', 'inativos')}`
                : ''}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {d.leitos.map((l, i) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 12px',
                  alignItems: 'center',
                  padding: '9px 0',
                  borderTop: i === 0 ? undefined : '1px solid var(--color-line)',
                  opacity: l.ativo ? 1 : 0.6,
                }}
              >
                <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)', flex: 1, minWidth: 130 }}>
                  {l.identificacao}
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', flex: 1, minWidth: 130 }}>
                  {TIPO_LEITO_ROTULO[l.tipo]}
                </span>
                {l.ativo ? null : <StatusBadge tone="neutral">Inativo</StatusBadge>}
                {(() => {
                  const ocupadas = noitesOcupadas(l.id as string);
                  const travado = l.ativo && ocupadas > 0;
                  return (
                    <Button
                      variant="ghost"
                      disabled={travado}
                      blockedReason={
                        travado
                          ? `Tem gente alocada em ${pluralizar(ocupadas, 'noite')} do evento aberto. Libere no mapa primeiro — inativar um leito ocupado faria a alocação sumir da grade sem sumir da conta.`
                          : undefined
                      }
                      onClick={() => alternarAtivo(d.id as string, l.id as string)}
                    >
                      {l.ativo ? 'Inativar' : 'Reativar'}
                    </Button>
                  );
                })()}
              </div>
            ))}
          </div>

          {novoEm === (d.id as string) ? (
            <div
              style={{
                background: 'var(--bg-sunken)',
                border: '1px solid var(--color-line)',
                borderRadius: 'var(--radius)',
                padding: '13px 15px',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 11 }}>
                <TextField
                  label="Identificação"
                  placeholder="F5 · superior"
                  value={identificacao}
                  density={campo ? 'field' : 'office'}
                  onChange={(e) => setIdentificacao(e.target.value)}
                />
                <Select
                  label="Tipo"
                  value={tipo}
                  onChange={(v) => setTipo(v as Leito['tipo'])}
                  options={(Object.keys(TIPO_LEITO_ROTULO) as Leito['tipo'][]).map((t) => ({
                    value: t,
                    label: TIPO_LEITO_ROTULO[t],
                  }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                <Button iconName="check" onClick={() => acrescentar(d)}>
                  Acrescentar
                </Button>
                <Button variant="quiet" onClick={() => setNovoEm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <span>
              <Button
                variant="ghost"
                iconName="plus"
                onClick={() => {
                  setNovoEm(d.id as string);
                  setIdentificacao('');
                  onRecado(null);
                }}
              >
                Acrescentar leito
              </Button>
            </span>
          )}
        </Cartao>
      ))}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Leito não se exclui, <b>se inativa</b>. Um beliche que já recebeu gente em algum evento faz parte do histórico
        daquele evento, e apagá-lo faria o mapa de uma cerimônia passada apontar para o nada.
      </span>
    </div>
  );
}

/** Q3 do Doc 4 §14.2, ainda sem resposta — e a resposta muda quem pode mexer. */
function QuestaoAberta() {
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderRadius: 'var(--radius)',
        padding: '13px 16px',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="message-circle-question" size={18} color="var(--color-suggest)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Quem cadastra leito: a operação ou a administração?
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Se cadastro de dormitório é operação de evento, o Acolhimento mexe. Se é parâmetro da casa, só a
          administração. A pergunta está aberta desde o mapa de telas e a resposta muda a permissão — por enquanto
          esta aba segue a leitura mais restrita.
        </p>
      </div>
    </div>
  );
}
