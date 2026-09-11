import { useMemo, useState } from 'react';
import type { ModoDePreenchimento, Pergunta, PerguntaPendente } from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Interruptor } from '../../components/Campo';
import { Cartao, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { pluralizar } from '../../lib/formato';
import { usuarioAtual } from '../../mocks/sessao';
import {
  fila,
  MODO_ROTULO,
  trabalhoDoDia,
  VERSAO_VIGENTE,
  type PessoaNaFila,
} from '../../mocks/anamnesePresencial';

/**
 * `P-06` · Anamnese presencial — Doc 4 §6.
 *
 * Tela de campo, e o Doc é explícito sobre onde ela acontece: com a pessoa na
 * frente, muitas vezes na chácara, possivelmente sem sinal. Três coisas moram
 * aqui e não moram em nenhuma outra tela: a resposta é **incremental** (quem
 * já respondeu recebe só o que mudou), o salvamento é **parcial e contínuo**
 * (anamnese interrompida não se perde) e quem digita **não é quem responde** —
 * `anamnese.responder_por_terceiro` é uma permissão à parte porque escrever
 * dado de saúde de outra pessoa é outro ato.
 */

const TOM_DO_MODO: Record<ModoDePreenchimento, BadgeTone> = {
  PRIMEIRA_VEZ: 'royal',
  INCREMENTAL: 'suggest',
  REVALIDACAO_COMPLETA: 'attention',
  EM_DIA: 'confirmed',
};

type Valores = Record<string, string>;

/** Uma pergunta respondida é uma pergunta com valor não vazio. RA4 mora aqui. */
const respondida = (v: string | undefined): boolean => (v ?? '').trim().length > 0;

function disparaAlerta(p: Pergunta, valor: string | undefined): string | null {
  const regra = p.regraDeAlerta;
  if (!regra || !respondida(valor)) return null;
  const v = valor!.trim();
  if (regra.quando === 'PREENCHIDO') return regra.mensagem;
  if (regra.quando === 'IGUAL') return v === regra.valor ? regra.mensagem : null;
  if (regra.quando === 'DIFERENTE') return v !== regra.valor ? regra.mensagem : null;
  return null;
}

export function AnamnesePresencialPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [comSinal, setComSinal] = useState(false);
  const [emFoco, setEmFoco] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<Record<string, Valores>>({});
  const [concluidas, setConcluidas] = useState<readonly string[]>([]);
  const [recado, setRecado] = useState<string | null>(null);

  const pessoa = fila.find((p) => (p.pessoaId as string) === emFoco) ?? null;

  const responder = (pessoaId: string, perguntaId: string, valor: string) =>
    setRascunhos((r) => ({ ...r, [pessoaId]: { ...(r[pessoaId] ?? {}), [perguntaId]: valor } }));

  const concluir = (p: PessoaNaFila, pontos: readonly string[]) => {
    setConcluidas((c) => [...c, p.pessoaId as string]);
    setEmFoco(null);
    setRecado(
      pontos.length > 0
        ? `Anamnese de ${p.nome} registrada na v${VERSAO_VIGENTE}. ${pluralizar(pontos.length, 'ponto de atenção', 'pontos de atenção')} para o parecer do acolhimento — o sistema sinaliza, quem decide é gente.`
        : `Anamnese de ${p.nome} registrada na v${VERSAO_VIGENTE}. Sem pontos de atenção.`,
    );
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'P-06' : 'P-06 · Anamnese presencial'}
        title="Anamnese presencial"
        subtitle={campo ? undefined : `${trabalhoDoDia.titulo} · ${trabalhoDoDia.local}`}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 28px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 900,
          minWidth: 0,
        }}
      >
        <FaixaDeConexao comSinal={comSinal} onAlternar={() => setComSinal((s) => !s)} />

        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        {pessoa === null ? (
          <Fila
            campo={campo}
            concluidas={concluidas}
            rascunhos={rascunhos}
            onAbrir={(p) => {
              setEmFoco(p.pessoaId as string);
              setRecado(null);
            }}
          />
        ) : (
          <Formulario
            pessoa={pessoa}
            campo={campo}
            valores={rascunhos[pessoa.pessoaId as string] ?? {}}
            comSinal={comSinal}
            onResponder={(perguntaId, valor) => responder(pessoa.pessoaId as string, perguntaId, valor)}
            onVoltar={() => setEmFoco(null)}
            onConcluir={(pontos) => concluir(pessoa, pontos)}
          />
        )}
      </div>
    </>
  );
}

/* ── Conexão e salvamento ────────────────────────────────────────────────── */

function FaixaDeConexao({ comSinal, onAlternar }: { comSinal: boolean; onAlternar: () => void }) {
  return (
    <div
      style={{
        background: comSinal ? 'var(--bg-sunken)' : 'var(--color-pending-soft)',
        border: `1px solid ${comSinal ? 'var(--color-line)' : 'var(--color-pending-border)'}`,
        borderRadius: 'var(--radius)',
        padding: '12px 15px',
        display: 'flex',
        gap: 11,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Icon
        name={comSinal ? 'circle-check' : 'wifi-off'}
        size={18}
        color={comSinal ? 'var(--color-confirmed)' : 'var(--color-pending)'}
      />
      <span style={{ flex: 1, minWidth: 220, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {comSinal ? (
          <>
            Com sinal. O que você responde sobe na hora.
          </>
        ) : (
          <>
            <b style={{ color: 'var(--text-primary)' }}>Sem sinal na chácara.</b> Continue — cada resposta fica gravada
            no aparelho e sobe sozinha quando a conexão voltar. Nada se perde por sair da tela.
          </>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>simular sinal</span>
        <Interruptor ligado={comSinal} onAlternar={onAlternar} rotuloAcessivel="simular conexão de rede" />
      </span>
    </div>
  );
}

/* ── A fila ──────────────────────────────────────────────────────────────── */

function Fila({
  campo,
  concluidas,
  rascunhos,
  onAbrir,
}: {
  campo: boolean;
  concluidas: readonly string[];
  rascunhos: Record<string, Valores>;
  onAbrir: (p: PessoaNaFila) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 11 : 13, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Rotulo>Fila de hoje</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {pluralizar(fila.length, 'pessoa')} de {trabalhoDoDia.inscritos} inscritos · formulário v{VERSAO_VIGENTE}
        </span>
      </div>

      {fila.map((p) => {
        const pronta = concluidas.includes(p.pessoaId as string);
        const rascunho = rascunhos[p.pessoaId as string] ?? {};
        const feitas = p.pendentes.filter((x) => respondida(rascunho[x.pergunta.id as string])).length;
        const emAndamento = !pronta && feitas > 0;
        const nada = p.modo === 'EM_DIA';

        return (
          <button
            key={p.pessoaId}
            type="button"
            onClick={() => (nada ? undefined : onAbrir(p))}
            disabled={nada || pronta}
            style={{
              textAlign: 'left',
              background: 'var(--bg-card)',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              padding: campo ? '15px 16px' : '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              cursor: nada || pronta ? 'default' : 'pointer',
              opacity: nada || pronta ? 0.72 : 1,
              minHeight: campo ? 'var(--target-field)' : undefined,
            }}
          >
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
              <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{p.nome}</span>
              <StatusBadge tone={pronta ? 'confirmed' : TOM_DO_MODO[p.modo]}>
                {pronta ? 'Respondida agora' : MODO_ROTULO[p.modo]}
              </StatusBadge>
              {emAndamento ? <StatusBadge tone="pending">rascunho salvo</StatusBadge> : null}
              <span style={{ flex: 1 }} />
              {nada || pronta ? null : (
                <Icon name="chevron-right" size={18} color="var(--text-meta)" />
              )}
            </span>

            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{p.vinculo}</span>

            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {nada
                ? `Respondeu a v${p.versaoAnterior} em ${p.respondidaEm} · vale até ${p.validaAte}`
                : pronta
                  ? `${pluralizar(p.pendentes.length, 'pergunta')} respondida${p.pendentes.length === 1 ? '' : 's'} agora`
                  : emAndamento
                    ? `${feitas} de ${p.pendentes.length} respondidas — continua de onde parou`
                    : pluralizar(p.pendentes.length, 'pergunta a fazer', 'perguntas a fazer')}
            </span>

            {p.observacao ? (
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{p.observacao}</span>
            ) : null}
          </button>
        );
      })}

      <Cartao campo={campo} style={{ gap: 9 }}>
        <Rotulo>Por que a lista não é igual para todo mundo</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Pergunta que só mudou de <b>redação</b> mantém o mesmo identificador e não volta a ser perguntada. Pergunta
          que mudou de <b>sentido</b> é outra pergunta, com identificador novo, e volta. Foi assim que a v3 pôde
          trocar “Está gestante?” por “Está gestante ou amamentando?” sem fingir que a resposta antiga servia.
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Resposta <b>vencida</b> é o caso em que nada se aproveita: condição de saúde muda com o tempo, e revalidar
          pela metade seria pior do que não revalidar.
        </span>
      </Cartao>
    </div>
  );
}

/* ── O formulário ────────────────────────────────────────────────────────── */

function Formulario({
  pessoa,
  campo,
  valores,
  comSinal,
  onResponder,
  onVoltar,
  onConcluir,
}: {
  pessoa: PessoaNaFila;
  campo: boolean;
  valores: Valores;
  comSinal: boolean;
  onResponder: (perguntaId: string, valor: string) => void;
  onVoltar: () => void;
  onConcluir: (pontos: readonly string[]) => void;
}) {
  const feitas = pessoa.pendentes.filter((x) => respondida(valores[x.pergunta.id as string])).length;

  const faltando = pessoa.pendentes.filter(
    (x) => x.pergunta.obrigatoria && !respondida(valores[x.pergunta.id as string]),
  );

  const pontos = useMemo(
    () =>
      pessoa.pendentes
        .map((x) => disparaAlerta(x.pergunta, valores[x.pergunta.id as string]))
        .filter((m): m is string => m !== null),
    [pessoa, valores],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="quiet" iconName="arrow-left" onClick={onVoltar} density={campo ? 'field' : 'office'}>
          Fila
        </Button>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{pessoa.nome}</span>
        <StatusBadge tone={TOM_DO_MODO[pessoa.modo]}>{MODO_ROTULO[pessoa.modo]}</StatusBadge>
      </div>

      <QuemResponde nome={pessoa.nome} />

      {pessoa.modo === 'REVALIDACAO_COMPLETA' ? (
        <AvisoDeRevalidacao pessoa={pessoa} />
      ) : null}

      {pessoa.herdadas.length > 0 ? <Herdadas pessoa={pessoa} campo={campo} /> : null}

      {pessoa.pendentes.map((x, i) => (
        <BlocoDePergunta
          key={x.pergunta.id}
          numero={i + 1}
          total={pessoa.pendentes.length}
          pendente={x}
          valor={valores[x.pergunta.id as string] ?? ''}
          campo={campo}
          onResponder={(v) => onResponder(x.pergunta.id as string, v)}
        />
      ))}

      {pontos.length > 0 ? (
        <Cartao campo={campo} style={{ gap: 7 }}>
          <Rotulo>{pluralizar(pontos.length, 'ponto de atenção', 'pontos de atenção')} até agora</Rotulo>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {pontos.join(' · ')}. Vão para o parecer do acolhimento — <b>não impedem participar</b>.
          </span>
        </Cartao>
      ) : null}

      {/*
        Barra de ação grudada no rodapé. Fica enxuta de propósito: numa tela de
        campo ela convive com o teclado aberto, e cada linha a mais aqui é uma
        pergunta a menos visível.
      */}
      <Cartao campo={campo} style={{ gap: 10, position: 'sticky', bottom: 0, boxShadow: 'var(--shadow-raised)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline' }}>
          <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
            {feitas} de {pessoa.pendentes.length}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>respondidas</span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              font: 'var(--text-small)',
              color: comSinal ? 'var(--color-confirmed)' : 'var(--color-pending)',
            }}
          >
            <Icon
              name={comSinal ? 'circle-check' : 'smartphone'}
              size={15}
              color={comSinal ? 'var(--color-confirmed)' : 'var(--color-pending)'}
            />
            {feitas === 0 ? 'nada a salvar ainda' : comSinal ? 'salvo há instantes' : 'salvo no aparelho'}
          </span>
        </div>

        <Button
          fullWidth
          density={campo ? 'field' : 'office'}
          iconName="check"
          disabled={faltando.length > 0}
          blockedReason={
            faltando.length > 0
              ? `Falta${faltando.length === 1 ? '' : 'm'} ${pluralizar(faltando.length, 'pergunta obrigatória', 'perguntas obrigatórias')} — estão marcadas acima, ainda em branco.`
              : undefined
          }
          onClick={() => onConcluir(pontos)}
        >
          Concluir a anamnese de {pessoa.nome.split(' ')[0]}
        </Button>
      </Cartao>
    </div>
  );
}

function QuemResponde({ nome }: { nome: string }) {
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderRadius: 'var(--radius)',
        padding: '12px 15px',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="user-round" size={17} color="var(--color-suggest)" style={{ marginTop: 2 }} />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '70ch' }}>
        Você está respondendo <b style={{ color: 'var(--text-primary)' }}>por {nome}</b>, com ela na sua frente. O
        registro guarda o nome dela como titular e o seu, <b>{usuarioAtual.nome}</b>, como quem digitou — escrever dado
        de saúde de outra pessoa é um ato com dono.
      </span>
    </div>
  );
}

function AvisoDeRevalidacao({ pessoa }: { pessoa: PessoaNaFila }) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="triangle-alert" size={19} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Resposta vencida — o formulário volta inteiro
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '70ch' }}>
          {pessoa.nome} respondeu a v{pessoa.versaoAnterior} em {pessoa.respondidaEm} e a validade terminou em{' '}
          {pessoa.validaAte}. Vencida não se complementa: nada das respostas antigas é reaproveitado, nem as perguntas
          cuja redação não mudou. Condição de saúde muda com o tempo, e meia revalidação daria uma falsa sensação de
          estar em dia.
        </p>
      </div>
    </div>
  );
}

function Herdadas({ pessoa, campo }: { pessoa: PessoaNaFila; campo: boolean }) {
  const [aberto, setAberto] = useState(false);
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', textAlign: 'left' }}
      >
        <Icon name={aberto ? 'chevron-down' : 'chevron-right'} size={17} color="var(--text-meta)" />
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {pluralizar(pessoa.herdadas.length, 'resposta')} da v{pessoa.versaoAnterior}{' '}
          {pessoa.herdadas.length === 1 ? 'que continua valendo' : 'que continuam valendo'}
        </span>
      </button>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Estas perguntas só mudaram de redação. Não se pergunta de novo o que a pessoa já respondeu — e não se finge que
        a resposta é nova.
      </span>

      {aberto
        ? pessoa.herdadas.map((h) => (
            <div
              key={h.perguntaId}
              style={{
                borderTop: '1px solid var(--color-line)',
                paddingTop: 9,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ font: 'var(--text-small)', color: 'var(--text-field-label)' }}>{h.texto}</span>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{h.valor}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>respondida na v{h.deVersao}</span>
            </div>
          ))
        : null}
    </Cartao>
  );
}

function BlocoDePergunta({
  numero,
  total,
  pendente,
  valor,
  campo,
  onResponder,
}: {
  numero: number;
  total: number;
  pendente: PerguntaPendente;
  valor: string;
  campo: boolean;
  onResponder: (valor: string) => void;
}) {
  const p = pendente.pergunta;
  const alerta = disparaAlerta(p, valor);

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 9px', alignItems: 'center' }}>
          <span data-numeric style={{ font: 'var(--text-code)', color: 'var(--text-meta)' }}>
            {numero}/{total}
          </span>
          {p.sensivel ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                font: 'var(--text-label)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--color-suggest)',
              }}
            >
              <Icon name="key-round" size={13} color="var(--color-suggest)" />
              sensível
            </span>
          ) : null}
          {p.obrigatoria ? null : (
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>pode ficar em branco</span>
          )}
          <span style={{ flex: 1 }} />
          <MotivoDaPergunta pendente={pendente} />
        </div>

        <span style={{ font: campo ? 'var(--text-body-strong)' : 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {p.texto}
        </span>
      </div>

      <Resposta pergunta={p} valor={valor} campo={campo} onResponder={onResponder} />

      {alerta ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="circle-alert" size={15} color="var(--color-pending)" style={{ marginTop: 2 }} />
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--color-pending)' }}>{alerta}.</b> Vira ponto de atenção no parecer. Não impede
            participar — o sistema sinaliza, a decisão é de gente.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}

function MotivoDaPergunta({ pendente }: { pendente: PerguntaPendente }) {
  const m = pendente.motivo;
  if (m.tipo === 'PRIMEIRA_VEZ') return <StatusBadge tone="royal">primeira vez</StatusBadge>;
  if (m.tipo === 'REVALIDACAO') return <StatusBadge tone="attention">revalidação</StatusBadge>;
  if (m.tipo === 'NOVA_NA_VERSAO') return <StatusBadge tone="suggest">nova na v{m.versao}</StatusBadge>;
  return (
    <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', textAlign: 'right' }}>
      substituiu “{m.textoAnterior}”
    </span>
  );
}

function Resposta({
  pergunta: p,
  valor,
  campo,
  onResponder,
}: {
  pergunta: Pergunta;
  valor: string;
  campo: boolean;
  onResponder: (valor: string) => void;
}) {
  if (p.tipo === 'BOOLEANO') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        {['Sim', 'Não'].map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={valor === o}
            campo={campo}
            onEscolher={() => onResponder(o)}
          />
        ))}
      </div>
    );
  }

  if (p.tipo === 'ESCOLHA_UNICA') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.opcoes.map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={valor === o}
            campo={campo}
            onEscolher={() => onResponder(o)}
          />
        ))}
      </div>
    );
  }

  if (p.tipo === 'ESCOLHA_MULTIPLA') {
    const marcadas = valor ? valor.split(' · ') : [];
    /** "Nenhuma delas" é exclusiva: marcar ela limpa o resto, e vice-versa. */
    const exclusiva = p.opcoes[p.opcoes.length - 1];
    const alternar = (o: string) => {
      if (o === exclusiva) return onResponder(marcadas.includes(o) ? '' : o);
      const sem = marcadas.filter((x) => x !== exclusiva && x !== o);
      onResponder((marcadas.includes(o) ? sem : [...sem, o]).join(' · '));
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {p.opcoes.map((o) => (
          <Opcao
            key={o}
            rotulo={o}
            pergunta={p.texto}
            marcada={marcadas.includes(o)}
            multipla
            campo={campo}
            onEscolher={() => alternar(o)}
          />
        ))}
      </div>
    );
  }

  return (
    <TextField
      multiline={p.codigo !== 'CONTATO_EMERGENCIA'}
      density={campo ? 'field' : 'office'}
      value={valor}
      placeholder={p.codigo === 'CONTATO_EMERGENCIA' ? 'Nome e telefone de quem a casa liga' : 'Escreva com as palavras dela'}
      onChange={(e) => onResponder(e.target.value)}
    />
  );
}

function Opcao({
  rotulo,
  pergunta,
  marcada,
  multipla = false,
  campo,
  onEscolher,
}: {
  rotulo: string;
  /** Entra no nome acessível: um botão “Sim” solto não diz sim a quê. */
  pergunta: string;
  marcada: boolean;
  /** Marca quadrada: redondo promete escolha única, e essa promessa importa. */
  multipla?: boolean;
  campo: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      aria-label={`${rotulo} — ${pergunta}`}
      onClick={onEscolher}
      style={{
        flex: 1,
        minHeight: campo ? 'var(--target-field)' : 44,
        padding: '11px 15px',
        textAlign: 'left',
        borderRadius: 'var(--radius)',
        border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
        background: marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        color: marcada ? 'var(--color-royal-ink)' : 'var(--text-primary)',
        font: marcada ? 'var(--text-body-strong)' : 'var(--text-body)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: multipla ? 5 : '50%',
          border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: marcada ? 'var(--color-royal)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
      </span>
      {rotulo}
    </button>
  );
}
