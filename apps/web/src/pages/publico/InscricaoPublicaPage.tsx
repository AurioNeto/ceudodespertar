import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Hospedagem, NivelDeContribuicao, Refeicao } from '@cdd/contracts';
import { Button, FlowerOfLife, Icon, StatusBadge, TextField } from '../../ds';
import { BlocoDePergunta, disparaAlerta, respondida } from '../../components/Anamnese';
import { Cartao, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarBRL, formatarDinheiro, pluralizar } from '../../lib/formato';
import {
  cadastros,
  CPFS_DE_EXEMPLO,
  eventoDoLink,
  linkDaCerimonia,
  MODO_RECADO,
  TEXTO_DA_DECLARACAO,
  VERSAO_VIGENTE,
  formularioInteiro,
  type CadastroEncontrado,
} from '../../mocks/inscricaoPublica';

/**
 * Inscrição pelo link da cerimônia — a única tela do sistema que um
 * participante vê, e a única fora do AppShell além do login.
 *
 * Ela existe porque duas premissas dos documentos estavam erradas: não há
 * anamnese presencial (quem responde é a própria pessoa) e autoinscrição não
 * é proibida (o que a casa quer humanizado é o atendimento da recepção, que
 * acontece no WhatsApp — e é de lá que este link sai).
 *
 * O reconhecimento é por CPF, e é o que torna o resto barato: quem já veio
 * antes responde só o que mudou e declara que o resto segue valendo.
 */

type Passo = 'IDENTIFICACAO' | 'CADASTRO' | 'ANAMNESE' | 'DECLARACAO' | 'PARTICIPACAO' | 'PRONTO';

const soDigitos = (v: string) => v.replace(/\D/g, '');

/** Máscara de CPF enquanto digita, sem brigar com quem cola o número inteiro. */
function mascararCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join('.');
  return d.length > 9 ? `${p}-${d.slice(9)}` : p;
}

interface Novo {
  nome: string;
  nascimento: string;
  telefone: string;
  cidade: string;
  email: string;
}

const NOVO_VAZIO: Novo = { nome: '', nascimento: '', telefone: '', cidade: '', email: '' };

export function InscricaoPublicaPage() {
  const campo = useDensidade() === 'field';

  const [passo, setPasso] = useState<Passo>('IDENTIFICACAO');
  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState<string | undefined>();
  const [cadastro, setCadastro] = useState<CadastroEncontrado | null>(null);
  const [novo, setNovo] = useState<Novo>(NOVO_VAZIO);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [declarado, setDeclarado] = useState(false);
  /** A pessoa pediu para refazer a anamnese estando no prazo. */
  const [refazendo, setRefazendo] = useState(false);

  const [nivel, setNivel] = useState<NivelDeContribuicao | null>(null);
  const [valor, setValor] = useState('');
  const [hospedagem, setHospedagem] = useState<Hospedagem>('SEM_HOSPEDAGEM');
  const [dias, setDias] = useState(1);
  const [refeicoes, setRefeicoes] = useState<readonly Refeicao[]>([]);
  const [emergencia, setEmergencia] = useState('');
  const [restricoes, setRestricoes] = useState('');

  /** Quem é a pessoa, venha do cadastro achado ou do que ela acabou de digitar. */
  const nome = cadastro?.nome ?? novo.nome;
  const primeiroNome = (cadastro?.primeiroNome ?? novo.nome.trim().split(/\s+/)[0]) || 'você';
  const pendentes = refazendo
    ? formularioInteiro('POR_ESCOLHA')
    : cadastro
      ? cadastro.pendentes
      : formularioInteiro('PRIMEIRA_VEZ');
  const modo = cadastro?.modo ?? 'PRIMEIRA_VEZ';
  const jaParticipou = cadastro?.jaParticipou ?? false;

  const identificar = () => {
    const d = soDigitos(cpf);
    if (d.length !== 11) {
      setErroCpf('O CPF tem 11 números.');
      return;
    }
    setErroCpf(undefined);
    const achado = cadastros.find((c) => soDigitos(c.cpf) === d) ?? null;
    setCadastro(achado);
    if (achado) {
      setEmergencia(achado.contatoEmergencia ?? '');
      setRestricoes(achado.restricoes ?? '');
      setPasso(achado.modo === 'EM_DIA' ? 'DECLARACAO' : 'ANAMNESE');
    } else {
      setNovo(NOVO_VAZIO);
      setPasso('CADASTRO');
    }
  };

  const faltandoNoCadastro = [
    !novo.nome.trim() && 'nome completo',
    !novo.nascimento.trim() && 'data de nascimento',
    !novo.telefone.trim() && 'telefone',
  ].filter((x): x is string => Boolean(x));

  const faltandoNaAnamnese = pendentes.filter(
    (x) => x.pergunta.obrigatoria && !respondida(valores[x.pergunta.id as string]),
  );

  const pontos = useMemo(
    () =>
      pendentes
        .map((x) => disparaAlerta(x.pergunta, valores[x.pergunta.id as string]))
        .filter((m): m is string => m !== null),
    [pendentes, valores],
  );

  const opcaoHosp = eventoDoLink.hospedagens.find((h) => h.tipo === hospedagem)!;
  const contribuicao = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const custoHospedagem = opcaoHosp.valorDiaria * dias;
  const custoRefeicoes = refeicoes.reduce(
    (s, r) => s + (eventoDoLink.refeicoes.find((x) => x.refeicao === r)?.valor ?? 0),
    0,
  );
  const total = contribuicao + custoHospedagem + custoRefeicoes;
  const semValor = valor.trim() === '';

  const faltandoNaParticipacao = [
    !emergencia.trim() && 'contato de emergência',
    !restricoes.trim() && 'restrições alimentares',
  ].filter((x): x is string => Boolean(x));

  return (
    <Moldura campo={campo} passo={passo}>
      {passo === 'IDENTIFICACAO' ? (
        <Identificacao
          campo={campo}
          cpf={cpf}
          erro={erroCpf}
          onCpf={(v) => {
            setCpf(mascararCpf(v));
            setErroCpf(undefined);
          }}
          onSeguir={identificar}
        />
      ) : null}

      {passo === 'CADASTRO' ? (
        <Passos titulo="Seu cadastro" recado={`O CPF ${cpf} ainda não está na casa. São cinco campos, uma vez só — na próxima cerimônia a casa já vai te reconhecer.`}>
          <TextField
            label="Nome completo"
            value={novo.nome}
            density={campo ? 'field' : 'office'}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          />
          <TextField
            label="Data de nascimento"
            placeholder="dd/mm/aaaa"
            value={novo.nascimento}
            density={campo ? 'field' : 'office'}
            onChange={(e) => setNovo({ ...novo, nascimento: e.target.value })}
          />
          <TextField
            label="Telefone com WhatsApp"
            placeholder="(11) 90000-0000"
            value={novo.telefone}
            density={campo ? 'field' : 'office'}
            onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
          />
          <TextField
            label="Cidade"
            value={novo.cidade}
            density={campo ? 'field' : 'office'}
            onChange={(e) => setNovo({ ...novo, cidade: e.target.value })}
          />
          <TextField
            label="E-mail"
            hint="Pode ficar em branco. A casa fala com você pelo WhatsApp."
            value={novo.email}
            density={campo ? 'field' : 'office'}
            onChange={(e) => setNovo({ ...novo, email: e.target.value })}
          />
          <Button
            fullWidth
            density={campo ? 'field' : 'office'}
            iconName="arrow-right"
            iconAfter
            disabled={faltandoNoCadastro.length > 0}
            blockedReason={faltandoNoCadastro.length > 0 ? `Falta ${faltandoNoCadastro.join(', ')}.` : undefined}
            onClick={() => setPasso('ANAMNESE')}
          >
            Continuar
          </Button>
        </Passos>
      ) : null}

      {passo === 'ANAMNESE' ? (
        <Passos
          titulo={refazendo ? 'Vamos do começo' : cadastro ? `Olá, ${primeiroNome}` : 'Sobre a sua saúde'}
          recado={
            refazendo
              ? 'Você pediu para responder de novo, então o formulário vem inteiro. O que você escrever agora substitui o que a casa tinha.'
              : (cadastro?.explicacao ??
                'A casa pergunta isso para cuidar de você durante o trabalho. Nada aqui impede a sua participação — o que existe é gente lendo com atenção.')
          }
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge
              tone={
                refazendo
                  ? 'confirmed'
                  : modo === 'REVALIDACAO_COMPLETA'
                    ? 'attention'
                    : modo === 'INCREMENTAL'
                      ? 'suggest'
                      : 'royal'
              }
            >
              {refazendo ? 'A seu pedido' : MODO_RECADO[modo]}
            </StatusBadge>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {pluralizar(pendentes.length, 'pergunta')} · leva uns {Math.max(2, Math.round(pendentes.length * 0.6))} minutos
            </span>
          </div>

          {cadastro && cadastro.herdadas.length > 0 && !refazendo ? (
            <Herdadas cadastro={cadastro} campo={campo} />
          ) : null}

          {pendentes.map((x, i) => (
            <BlocoDePergunta
              key={x.pergunta.id}
              numero={i + 1}
              total={pendentes.length}
              pendente={x}
              valor={valores[x.pergunta.id as string] ?? ''}
              campo={campo}
              onResponder={(v) => setValores((r) => ({ ...r, [x.pergunta.id as string]: v }))}
            />
          ))}

          <Guardado quantas={Object.values(valores).filter(respondida).length} />

          <Button
            fullWidth
            density={campo ? 'field' : 'office'}
            iconName="arrow-right"
            iconAfter
            disabled={faltandoNaAnamnese.length > 0}
            blockedReason={
              faltandoNaAnamnese.length > 0
                ? `Falta${faltandoNaAnamnese.length === 1 ? '' : 'm'} ${pluralizar(faltandoNaAnamnese.length, 'pergunta obrigatória', 'perguntas obrigatórias')} acima.`
                : undefined
            }
            onClick={() => setPasso('DECLARACAO')}
          >
            Continuar
          </Button>
        </Passos>
      ) : null}

      {passo === 'DECLARACAO' ? (
        <Declaracao
          campo={campo}
          cadastro={cadastro}
          primeiroNome={primeiroNome}
          refeita={refazendo}
          declarado={declarado}
          onDeclarar={() => setDeclarado((d) => !d)}
          onRefazer={() => {
            setRefazendo(true);
            setValores({});
            setDeclarado(false);
            setPasso('ANAMNESE');
          }}
          onSeguir={() => setPasso('PARTICIPACAO')}
        />
      ) : null}

      {passo === 'PARTICIPACAO' ? (
        <Participacao
          campo={campo}
          nivel={nivel}
          valor={valor}
          onNivel={(n, v) => {
            setNivel(n);
            setValor(v);
          }}
          onValor={(v) => {
            setValor(v);
            setNivel(null);
          }}
          hospedagem={hospedagem}
          onHospedagem={setHospedagem}
          dias={dias}
          onDias={setDias}
          refeicoes={refeicoes}
          onRefeicoes={setRefeicoes}
          emergencia={emergencia}
          onEmergencia={setEmergencia}
          restricoes={restricoes}
          onRestricoes={setRestricoes}
          total={total}
          semValor={semValor}
          custoHospedagem={custoHospedagem}
          custoRefeicoes={custoRefeicoes}
          contribuicao={contribuicao}
          faltando={faltandoNaParticipacao}
          onEnviar={() => setPasso('PRONTO')}
        />
      ) : null}

      {passo === 'PRONTO' ? (
        <Pronto
          campo={campo}
          nome={nome}
          primeiraVez={!jaParticipou}
          pontos={pontos}
          total={total}
          semValor={semValor}
        />
      ) : null}
    </Moldura>
  );
}

/* ── Moldura ─────────────────────────────────────────────────────────────── */

const ORDEM: readonly Passo[] = ['IDENTIFICACAO', 'CADASTRO', 'ANAMNESE', 'DECLARACAO', 'PARTICIPACAO', 'PRONTO'];

function Moldura({ campo, passo, children }: { campo: boolean; passo: Passo; children: ReactNode }) {
  const indice = ORDEM.indexOf(passo);
  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-brand)',
          borderBottom: '1px solid var(--color-line-gold)',
          padding: campo ? '18px 18px 16px' : '26px 32px 22px',
        }}
      >
        {campo ? null : (
          <div aria-hidden style={{ position: 'absolute', width: 380, height: 380, right: -110, top: -120 }}>
            <FlowerOfLife />
          </div>
        )}
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div
            style={{
              font: campo ? '800 15px/1.05 var(--font-display)' : '800 22px/1.02 var(--font-display)',
              letterSpacing: '.01em',
              textTransform: 'uppercase',
              color: 'var(--color-ink-brand)',
            }}
          >
            Céu do Despertar
          </div>
          <div style={{ marginTop: 7, font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {eventoDoLink.nome} — {eventoDoLink.data}
          </div>
          <div style={{ marginTop: 3, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {eventoDoLink.local} · inscrição
          </div>

          <div style={{ marginTop: 13, display: 'flex', gap: 5 }}>
            {ORDEM.slice(0, -1).map((x, i) => (
              <span
                key={x}
                aria-hidden
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 'var(--radius-pill)',
                  background: i <= indice ? 'var(--color-ink-brand)' : 'var(--color-line-gold)',
                }}
              />
            ))}
          </div>
        </div>
      </header>

      <main
        className="cdd-papel-estampado"
        style={{ flex: 1, padding: campo ? '16px 16px 40px' : '26px 32px 48px', overflow: 'auto' }}
      >
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: campo ? 13 : 16 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function Passos({ titulo, recado, children }: { titulo: string; recado: string; children: ReactNode }) {
  return (
    <>
      <div>
        <h1 style={{ font: 'var(--text-display)', color: 'var(--text-title)' }}>{titulo}</h1>
        <p style={{ marginTop: 8, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '58ch' }}>
          {recado}
        </p>
      </div>
      {children}
    </>
  );
}

/* ── Passo 1 · CPF ───────────────────────────────────────────────────────── */

function Identificacao({
  campo,
  cpf,
  erro,
  onCpf,
  onSeguir,
}: {
  campo: boolean;
  cpf: string;
  erro?: string;
  onCpf: (v: string) => void;
  onSeguir: () => void;
}) {
  return (
    <Passos
      titulo="Vamos começar pelo seu CPF"
      recado="Se você já veio aqui antes, a casa te reconhece e pergunta bem menos. Se é a primeira vez, o cadastro é rápido e serve para sempre."
    >
      <Cartao campo={campo} style={{ gap: 13 }}>
        <TextField
          label="CPF"
          placeholder="000.000.000-00"
          inputMode="numeric"
          value={cpf}
          error={erro}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onCpf(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSeguir();
          }}
        />
        <Button fullWidth density={campo ? 'field' : 'office'} iconName="arrow-right" iconAfter onClick={onSeguir}>
          Continuar
        </Button>
      </Cartao>

      <Cartao campo={campo} style={{ gap: 9 }}>
        <Rotulo>Protótipo — CPFs que funcionam aqui</Rotulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {CPFS_DE_EXEMPLO.map((x) => (
            <button
              key={x.cpf}
              type="button"
              onClick={() => onCpf(x.cpf)}
              style={{
                textAlign: 'left',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                flexWrap: 'wrap',
                cursor: 'pointer',
                font: 'var(--text-small)',
                color: 'var(--text-secondary)',
              }}
            >
              <code style={{ font: 'var(--text-code)', color: 'var(--text-link)' }}>{x.cpf}</code>
              <span>{x.descricao}</span>
            </button>
          ))}
        </div>
      </Cartao>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Este link é desta cerimônia: <code style={{ font: 'var(--text-code)' }}>{linkDaCerimonia.url}</code>
      </span>
    </Passos>
  );
}

/* ── Respostas herdadas ──────────────────────────────────────────────────── */

function Herdadas({ cadastro, campo }: { cadastro: CadastroEncontrado; campo: boolean }) {
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
          {pluralizar(cadastro.herdadas.length, 'resposta sua', 'respostas suas')} que a casa já tem
        </span>
      </button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Estas perguntas só mudaram de redação desde que você respondeu. A casa não pergunta de novo o que você já
        disse — e também não finge que a resposta é nova.
      </span>
      {aberto
        ? cadastro.herdadas.map((h) => (
            <div
              key={h.perguntaId}
              style={{ borderTop: '1px solid var(--color-line)', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ font: 'var(--text-small)', color: 'var(--text-field-label)' }}>{h.texto}</span>
              <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{h.valor}</span>
            </div>
          ))
        : null}
    </Cartao>
  );
}

function Guardado({ quantas }: { quantas: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon
        name={quantas > 0 ? 'circle-check' : 'smartphone'}
        size={15}
        color={quantas > 0 ? 'var(--color-confirmed)' : 'var(--text-meta)'}
      />
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {quantas > 0
          ? `${pluralizar(quantas, 'resposta guardada', 'respostas guardadas')}. Pode fechar e voltar depois — nada se perde.`
          : 'Pode fechar e voltar depois. O que você responder fica guardado neste aparelho.'}
      </span>
    </div>
  );
}

/* ── Passo 4 · declaração por cerimônia ──────────────────────────────────── */

function Declaracao({
  campo,
  cadastro,
  primeiroNome,
  refeita,
  declarado,
  onDeclarar,
  onRefazer,
  onSeguir,
}: {
  campo: boolean;
  cadastro: CadastroEncontrado | null;
  primeiroNome: string;
  refeita: boolean;
  declarado: boolean;
  onDeclarar: () => void;
  onRefazer: () => void;
  onSeguir: () => void;
}) {
  const emDia = cadastro?.modo === 'EM_DIA' && !refeita;
  return (
    <Passos
      titulo={emDia ? `Olá, ${primeiroNome}` : 'Uma última confirmação'}
      recado={
        emDia
          ? cadastro!.explicacao
          : 'Anamnese respondida. Falta só você confirmar que vale para este trabalho.'
      }
    >
      {cadastro ? (
        <Cartao campo={campo} style={{ gap: 7 }}>
          <Rotulo>O que a casa tem de você</Rotulo>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            {refeita
              ? `Anamnese v${VERSAO_VIGENTE} respondida agora, por você`
              : `Anamnese v${cadastro.versaoAnterior} respondida em ${cadastro.respondidaEm}`}
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            {refeita
              ? `Substitui a resposta de ${cadastro.respondidaEm}. A anterior fica no histórico da casa, sem valer mais.`
              : emDia
                ? `Vale até ${cadastro.validaAte}.`
                : `Atualizada agora para a v${VERSAO_VIGENTE}.`}
          </span>
        </Cartao>
      ) : null}

      <button
        type="button"
        role="checkbox"
        aria-checked={declarado}
        onClick={onDeclarar}
        style={{
          textAlign: 'left',
          display: 'flex',
          gap: 13,
          alignItems: 'flex-start',
          padding: campo ? '15px 16px' : '17px 19px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${declarado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: declarado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: 6,
            marginTop: 1,
            border: `2px solid ${declarado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
            background: declarado ? 'var(--color-royal)' : 'transparent',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {declarado ? <Icon name="check" size={14} color="var(--bg-card)" /> : null}
        </span>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{TEXTO_DA_DECLARACAO}</span>
      </button>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>
        A casa pede isso a cada trabalho, mesmo de quem está em dia. É o jeito de saber de um remédio que começou
        semana passada sem obrigar todo mundo a refazer o formulário inteiro.
      </span>

      {refeita ? null : <PortaDeRefazer campo={campo} onRefazer={onRefazer} />}

      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="arrow-right"
        iconAfter
        disabled={!declarado}
        blockedReason={!declarado ? 'Marque a declaração acima para seguir.' : undefined}
        onClick={onSeguir}
      >
        Continuar
      </Button>
    </Passos>
  );
}

/**
 * A saída de quem **não pode** declarar que segue verdadeiro.
 *
 * Sem ela a declaração é uma armadilha: quem mudou de condição fica entre
 * afirmar algo falso e abandonar a inscrição, e as duas saídas são piores para
 * a casa do que a pergunta a mais. Fica ao lado da declaração, não escondida
 * num "editar" — é ali que a pessoa descobre que precisa dela.
 */
function PortaDeRefazer({ campo, onRefazer }: { campo: boolean; onRefazer: () => void }) {
  return (
    <Cartao campo={campo} style={{ gap: 9 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon name="rotate-ccw" size={17} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
            Mudou alguma coisa na sua saúde?
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Se você não pode confirmar o que está acima, não marque. Responder de novo é melhor para todo mundo — e
            não tem problema nenhum.
          </span>
        </div>
      </div>
      <Button variant="quiet" fullWidth density={campo ? 'field' : 'office'} iconName="rotate-ccw" onClick={onRefazer}>
        Quero responder de novo
      </Button>
    </Cartao>
  );
}

/* ── Passo 5 · participação ──────────────────────────────────────────────── */

function Participacao(props: {
  campo: boolean;
  nivel: NivelDeContribuicao | null;
  valor: string;
  onNivel: (n: NivelDeContribuicao, v: string) => void;
  onValor: (v: string) => void;
  hospedagem: Hospedagem;
  onHospedagem: (h: Hospedagem) => void;
  dias: number;
  onDias: (n: number) => void;
  refeicoes: readonly Refeicao[];
  onRefeicoes: (r: readonly Refeicao[]) => void;
  emergencia: string;
  onEmergencia: (v: string) => void;
  restricoes: string;
  onRestricoes: (v: string) => void;
  total: number;
  semValor: boolean;
  contribuicao: number;
  custoHospedagem: number;
  custoRefeicoes: number;
  faltando: readonly string[];
  onEnviar: () => void;
}) {
  const { campo } = props;
  const social = eventoDoLink.contribuicoes[0]!.valor;
  const prospero = eventoDoLink.contribuicoes[2]!.valor;
  const digitado = Math.round(Number(props.valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;

  return (
    <Passos
      titulo="Sua participação"
      recado="Contribuição, onde você dorme e o que a casa precisa saber para cuidar de você."
    >
      <Cartao campo={campo} style={{ gap: 12 }}>
        <Rotulo>Contribuição</Rotulo>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '60ch' }}>
          Três valores sugeridos pelos padrinhos, referentes à participação na cerimônia. <b>São sugestão, não
          preço.</b> Escolha o que couber na sua condição — e, se puder e quiser contribuir mais, também pode.
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          {eventoDoLink.contribuicoes.map((c) => {
            const marcado = props.nivel === c.nivel;
            return (
              <button
                key={c.nivel}
                type="button"
                aria-pressed={marcado}
                onClick={() => props.onNivel(c.nivel, formatarDinheiro(c.valor))}
                style={{
                  textAlign: 'left',
                  padding: '13px 15px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${marcado ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                  background: marcado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                  minHeight: campo ? 'var(--target-field)' : undefined,
                }}
              >
                <span style={{ font: 'var(--text-body-strong)', color: marcado ? 'var(--color-royal-ink)' : 'var(--text-primary)' }}>
                  {c.rotulo}
                </span>
                <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--color-royal-deep)' }}>
                  {formatarBRL(c.valor)}
                </span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{c.explicacao}</span>
              </button>
            );
          })}
        </div>

        <TextField
          label="Quanto você vai contribuir"
          value={props.valor}
          placeholder="0,00"
          inputMode="decimal"
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onValor(e.target.value)}
          hint="Pode digitar outro valor. Ninguém vai te cobrar explicação."
        />

        {digitado > 0 && digitado < social ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Abaixo do valor social, e tudo bem. Se quiser conversar sobre isso, a recepção está no WhatsApp.
          </span>
        ) : null}
        {digitado > prospero ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
            Obrigado — isso é contribuição voluntária acima do sugerido.
          </span>
        ) : null}
      </Cartao>

      <Cartao campo={campo} style={{ gap: 11 }}>
        <Rotulo>Onde você vai dormir</Rotulo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {eventoDoLink.hospedagens.map((h) => {
            const marcada = props.hospedagem === h.tipo;
            return (
              <button
                key={h.tipo}
                type="button"
                aria-pressed={marcada}
                aria-label={h.rotulo}
                onClick={() => props.onHospedagem(h.tipo)}
                style={{
                  textAlign: 'left',
                  padding: '11px 14px',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                  background: marcada ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 11,
                  alignItems: 'center',
                  minHeight: campo ? 'var(--target-field)' : undefined,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
                    background: marcada ? 'var(--color-royal)' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{h.rotulo}</span>
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{h.nota}</span>
                </span>
                <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {h.valorDiaria > 0 ? `${formatarBRL(h.valorDiaria)} / dia` : 'sem custo'}
                </span>
              </button>
            );
          })}
        </div>
        {props.custoHospedagem > 0 ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {pluralizar(props.dias, 'diária')} · {formatarBRL(props.custoHospedagem)} de acomodação,{' '}
            <b>à parte da contribuição</b>.
          </span>
        ) : null}
      </Cartao>

      <Cartao campo={campo} style={{ gap: 11 }}>
        <Rotulo>Para a casa cuidar de você</Rotulo>
        <TextField
          label="Contato de emergência"
          placeholder="Nome e telefone de quem a casa liga"
          value={props.emergencia}
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onEmergencia(e.target.value)}
        />
        <TextField
          label="Restrições alimentares"
          placeholder="O que você não come, ou “nenhuma”"
          value={props.restricoes}
          density={campo ? 'field' : 'office'}
          onChange={(e) => props.onRestricoes(e.target.value)}
        />
        {props.restricoes.trim() ? null : (
          <span>
            <Button variant="ghost" onClick={() => props.onRestricoes('Nenhuma')}>
              Não tenho nenhuma
            </Button>
          </span>
        )}
      </Cartao>

      <Cartao campo={campo} style={{ gap: 12 }}>
        {props.semValor ? (
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--text-secondary)' }}>A combinar</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
              {formatarBRL(props.total)}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {formatarBRL(props.contribuicao)} de contribuição
              {props.custoHospedagem > 0 ? ` · ${formatarBRL(props.custoHospedagem)} de acomodação` : ''}
              {props.custoRefeicoes > 0 ? ` · ${formatarBRL(props.custoRefeicoes)} de alimentação` : ''}
            </span>
          </div>
        )}
        <Button
          fullWidth
          density={campo ? 'field' : 'office'}
          iconName="check-check"
          disabled={props.faltando.length > 0}
          blockedReason={props.faltando.length > 0 ? `Falta preencher: ${props.faltando.join(' e ')}.` : undefined}
          onClick={props.onEnviar}
        >
          Enviar minha inscrição
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          Você não paga por aqui. O pagamento é combinado com a recepção.
        </span>
      </Cartao>
    </Passos>
  );
}

/* ── Passo 6 · pronto ────────────────────────────────────────────────────── */

function Pronto({
  campo,
  nome,
  primeiraVez,
  pontos,
  total,
  semValor,
}: {
  campo: boolean;
  nome: string;
  primeiraVez: boolean;
  pontos: readonly string[];
  total: number;
  semValor: boolean;
}) {
  return (
    <Passos
      titulo="Inscrição enviada"
      recado={`Está tudo com a casa, ${nome.trim().split(/\s+/)[0]}. A recepção confirma a sua vaga pelo WhatsApp.`}
    >
      <Cartao campo={campo} style={{ gap: 11 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="circle-check" size={22} color="var(--color-confirmed)" />
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
            {eventoDoLink.nome} — {eventoDoLink.data}
          </span>
        </div>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
          {semValor ? 'Valor a combinar com a recepção.' : `${formatarBRL(total)} combinados.`}
        </span>
      </Cartao>

      {primeiraVez ? (
        <Cartao campo={campo} style={{ gap: 8 }}>
          <Rotulo>Antes do trabalho</Rotulo>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            Como é a sua primeira vez, alguém da casa vai te chamar para uma conversa.
          </span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Não é entrevista nem avaliação — é para você saber o que esperar e poder perguntar o que quiser.
          </span>
        </Cartao>
      ) : null}

      {pontos.length > 0 ? (
        <Cartao campo={campo} style={{ gap: 8 }}>
          <Rotulo>O que você declarou e a casa vai ler com atenção</Rotulo>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{pontos.join(' · ')}.</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            Nada disso impede a sua participação. Se a casa precisar conversar sobre algum ponto, ela procura você
            antes do dia.
          </span>
        </Cartao>
      ) : null}

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '62ch' }}>
        Suas respostas de saúde ficam guardadas com a casa e só o acolhimento consegue abrir — e toda vez que alguém
        abre, fica registrado quem foi.
      </span>
    </Passos>
  );
}
