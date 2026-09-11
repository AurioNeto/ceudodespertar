import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Hospedagem,
  ModalidadeCrianca,
  NivelDeContribuicao,
  Refeicao,
  TipoParticipacao,
} from '@cdd/contracts';
import { Button, Icon, ScreenHeader, StatusBadge, TextField, type BadgeTone } from '../../ds';
import { Interruptor, Select, SeletorDeTipo } from '../../components/Campo';
import { Cartao, Recado, Rotulo } from '../../components/Blocos';
import { useDensidade } from '../../lib/useDensidade';
import { formatarBRL, formatarDinheiro, pluralizar } from '../../lib/formato';
import {
  ANAMNESE_ROTULO,
  CONSAGRA_POR_PADRAO,
  diretorio,
  eventos,
  TIPO_EXPLICACAO,
  TIPO_ROTULO,
  type PessoaDoDiretorio,
} from '../../mocks/inscricao';
import { linkDaCerimonia } from '../../mocks/inscricaoPublica';

/**
 * `E-06` · Inscrição — Doc 4 §7 e Doc 2 §2.4.
 *
 * A tela onde os invariantes de inscrição se encontram: `EQUIPE` é isento e
 * não zero (IN1), criança estelar exige responsável, modalidade e autorização
 * vigente (IN2), anamnese em dia é condição de confirmar (IN5), primeira vez
 * exige a conversa registrada (IN6), leito pede alocação (IN9) — e contato de
 * emergência e restrição alimentar são obrigatórios para todo mundo (IN4),
 * que é a única obrigatoriedade dura do fluxo.
 *
 * A contribuição segue a decisão da coordenação: **três níveis sugeridos**,
 * não uma tabela de preço. O valor é sempre editável, para menos e para mais,
 * porque contribuição negociada é a prática da casa e o sistema não pode
 * atrapalhá-la.
 */

const TOM_DA_ANAMNESE: Record<string, BadgeTone> = {
  OK: 'confirmed',
  PENDENTE: 'attention',
  VENCIDA: 'attention',
  NAO_APLICAVEL: 'neutral',
};

interface Pendencia {
  chave: string;
  titulo: string;
  detalhe: string;
  invariante: string;
  acao?: { rotulo: string; ao: () => void };
}

export function InscricaoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';

  const [eventoId, setEventoId] = useState(eventos[0]!.id as string);
  const evento = eventos.find((e) => (e.id as string) === eventoId)!;

  const [busca, setBusca] = useState('');
  const [pessoa, setPessoa] = useState<PessoaDoDiretorio | null>(null);
  const [tipo, setTipo] = useState<TipoParticipacao>('PARTICIPANTE');
  const [consagra, setConsagra] = useState(true);
  const [modalidade, setModalidade] = useState<ModalidadeCrianca>('PERMANECE_SOB_SUPERVISAO');
  const [responsavel, setResponsavel] = useState('');
  const [primeiraVez, setPrimeiraVez] = useState(false);
  const [acolhimentoFeito, setAcolhimentoFeito] = useState(false);

  const [nivel, setNivel] = useState<NivelDeContribuicao | null>(null);
  const [valor, setValor] = useState('');
  const [hospedagem, setHospedagem] = useState<Hospedagem>('SEM_HOSPEDAGEM');
  const [dias, setDias] = useState(1);
  const [leitoAlocado, setLeitoAlocado] = useState(false);
  const [refeicoes, setRefeicoes] = useState<readonly Refeicao[]>([]);

  const [emergencia, setEmergencia] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [recado, setRecado] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const escolher = (p: PessoaDoDiretorio) => {
    setPessoa(p);
    setBusca('');
    const novoTipo: TipoParticipacao = p.menorDeIdade ? 'CRIANCA_ESTELAR' : 'PARTICIPANTE';
    setTipo(novoTipo);
    setConsagra(CONSAGRA_POR_PADRAO[novoTipo]);
    setPrimeiraVez(!p.jaParticipou);
    setAcolhimentoFeito(p.acolhimento === 'REALIZADO');
    setResponsavel('');
    setModalidade('PERMANECE_SOB_SUPERVISAO');
    setNivel(null);
    setValor('');
    setHospedagem('SEM_HOSPEDAGEM');
    setLeitoAlocado(false);
    setRefeicoes([]);
    setEmergencia(p.contatoEmergencia ?? '');
    setRestricoes(p.restricoes ?? '');
    setRecado(null);
  };

  const trocarTipo = (t: TipoParticipacao) => {
    setTipo(t);
    setConsagra(t === 'CRIANCA_ESTELAR' ? modalidade === 'PARTICIPA_RITUAL' : CONSAGRA_POR_PADRAO[t]);
  };

  const trocarModalidade = (m: ModalidadeCrianca) => {
    setModalidade(m);
    setConsagra(m === 'PARTICIPA_RITUAL');
  };

  const isento = tipo === 'EQUIPE';
  /** IN3 e a questão aberta: a equipe consagra e, por prática da casa, não responde. */
  const anamneseExigida = consagra && tipo !== 'EQUIPE';
  const opcaoHosp = evento.hospedagens.find((h) => h.tipo === hospedagem)!;

  const contribuicao = isento ? 0 : Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const custoHospedagem = opcaoHosp.valorDiaria * dias;
  const custoRefeicoes = refeicoes.reduce(
    (s, r) => s + (evento.refeicoes.find((x) => x.refeicao === r)?.valor ?? 0),
    0,
  );
  const total = contribuicao + custoHospedagem + custoRefeicoes;
  /** Nem isento nem zero: ninguém conversou sobre valor ainda. */
  const semValor = !isento && valor.trim() === '';

  const pendencias: readonly Pendencia[] = useMemo(() => {
    if (!pessoa) return [];
    const lista: Pendencia[] = [];

    if (tipo === 'CRIANCA_ESTELAR') {
      if (!responsavel) {
        lista.push({
          chave: 'responsavel',
          titulo: 'Falta o responsável',
          detalhe: 'Criança estelar não se inscreve sozinha: alguém responde por ela neste trabalho.',
          invariante: 'IN2',
        });
      } else if (!pessoa.autorizacaoVigente && !diretorio.find((d) => d.nome === responsavel)?.autorizacaoVigente) {
        lista.push({
          chave: 'autorizacao',
          titulo: 'Sem autorização vigente para este trabalho',
          detalhe: 'A autorização é por evento — não existe autorizar para o ano. É colhida na chegada, com o responsável presente.',
          invariante: 'IN2',
        });
      }
    }

    if (anamneseExigida && pessoa.anamnese !== 'OK') {
      lista.push({
        chave: 'anamnese',
        titulo: pessoa.anamnese === 'VENCIDA' ? 'Anamnese vencida' : 'Anamnese pendente',
        detalhe:
          'Quem consagra precisa da anamnese em dia. Não é burocracia: é o que identifica medicação e condição incompatíveis com a consagração. Quem responde é a própria pessoa, pelo link da cerimônia — ninguém da casa preenche por ela.',
        invariante: 'IN5',
        acao: { rotulo: 'Copiar o link para mandar no WhatsApp', ao: () => setLinkCopiado(true) },
      });
    }

    if (primeiraVez && !acolhimentoFeito) {
      lista.push({
        chave: 'acolhimento',
        titulo: 'Conversa de primeira vez não registrada',
        detalhe: 'A casa já faz essa conversa. O que faltava era o registro de que ela aconteceu.',
        invariante: 'IN6',
        acao: { rotulo: 'Registrar a conversa', ao: () => setAcolhimentoFeito(true) },
      });
    }

    if (opcaoHosp.ocupaLeito && !leitoAlocado) {
      lista.push({
        chave: 'leito',
        titulo: 'Leito não alocado',
        detalhe: `Quem dorme em ${opcaoHosp.rotulo.toLowerCase()} ocupa vaga, e a vaga se escolhe no mapa de leitos. Há ${pluralizar(evento.leitosLivres, 'leito livre', 'leitos livres')}.`,
        invariante: 'IN9',
        acao: { rotulo: 'Alocar um leito', ao: () => setLeitoAlocado(true) },
      });
    }

    if (!emergencia.trim() || !restricoes.trim()) {
      lista.push({
        chave: 'emergencia',
        titulo: 'Contato de emergência e restrição alimentar',
        detalhe: 'Obrigatórios para todo mundo, inclusive para quem não consagra. É a única exigência dura da inscrição.',
        invariante: 'IN4',
      });
    }

    return lista;
  }, [
    pessoa,
    tipo,
    responsavel,
    anamneseExigida,
    primeiraVez,
    acolhimentoFeito,
    opcaoHosp,
    leitoAlocado,
    evento.leitosLivres,
    emergencia,
    restricoes,
  ]);

  const gravar = (confirmada: boolean) => {
    if (!pessoa) return;
    setRecado(
      confirmada
        ? `${pessoa.nome} está confirmada no ${evento.nome} de ${evento.data}. ${isento ? 'Isenta de contribuição.' : semValor ? 'Valor a combinar.' : `Devido: ${formatarBRL(total)}.`} O pagamento se marca na recepção, no dia.`
        : `Inscrição de ${pessoa.nome} salva como pendente. Ela aparece na lista do trabalho com ${pluralizar(pendencias.length, 'pendência')} — e nada se perde por salvar assim.`,
    );
    setPessoa(null);
  };

  return (
    <>
      <ScreenHeader
        code={campo ? 'E-06' : 'E-06 · Inscrição'}
        title="Inscrição"
        subtitle={campo ? undefined : 'Inscrever alguém num trabalho · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 28px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 14 : 18,
          maxWidth: campo ? undefined : 960,
          minWidth: 0,
        }}
      >
        {recado ? <Recado texto={recado} onFechar={() => setRecado(null)} /> : null}

        <EscolhaDoEvento
          eventoId={eventoId}
          onTrocar={(v) => {
            setEventoId(v);
            setRefeicoes([]);
            setLeitoAlocado(false);
          }}
          campo={campo}
        />

        <LinkDaCerimonia campo={campo} copiado={linkCopiado} onCopiar={() => setLinkCopiado(true)} />

        {pessoa === null ? (
          <BuscaDePessoa busca={busca} onBusca={setBusca} onEscolher={escolher} campo={campo} />
        ) : (
          <>
            <PessoaEscolhida pessoa={pessoa} campo={campo} onTrocar={() => setPessoa(null)} />

            <Bloco titulo="Como participa" campo={campo}>
              <SeletorDeTipo
                opcoes={(['PARTICIPANTE', 'CONVIDADO', 'EQUIPE', 'CRIANCA_ESTELAR'] as const).map((t) => ({
                  valor: t,
                  label: TIPO_ROTULO[t],
                }))}
                valor={tipo}
                onEscolher={trocarTipo}
                densidade={campo ? 'field' : 'office'}
              />
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {TIPO_EXPLICACAO[tipo]}
              </span>

              {tipo === 'CRIANCA_ESTELAR' ? (
                <>
                  <Select
                    label="Responsável neste trabalho"
                    value={responsavel}
                    onChange={setResponsavel}
                    options={[
                      { value: '', label: 'Escolha quem responde por ela' },
                      ...diretorio
                        .filter((d) => !d.menorDeIdade)
                        .map((d) => ({ value: d.nome, label: d.nome })),
                    ]}
                  />
                  <SeletorDeTipo
                    opcoes={[
                      { valor: 'PERMANECE_SOB_SUPERVISAO' as const, label: 'Permanece sob supervisão' },
                      { valor: 'PARTICIPA_RITUAL' as const, label: 'Participa do ritual' },
                    ]}
                    valor={modalidade}
                    onEscolher={trocarModalidade}
                    densidade={campo ? 'field' : 'office'}
                  />
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    A modalidade não é detalhe: ela decide se a criança consagra, e com isso se a anamnese se aplica.
                  </span>
                </>
              ) : null}

              <LinhaDeInterruptor
                rotulo="Consagra neste trabalho"
                nota={
                  tipo === 'EQUIPE' && consagra
                    ? 'A equipe consagra e, por prática da casa, não responde anamnese. Está registrado como questão aberta para a coordenação — é diferente de ser acidental.'
                    : consagra
                      ? 'Entra na estimativa de consumo de daime e, fora da equipe, exige anamnese em dia.'
                      : 'Presente sem consagrar. A anamnese deixa de se aplicar, e a estimativa de consumo não conta esta pessoa.'
                }
                ligado={consagra}
                onAlternar={() => setConsagra((c) => !c)}
              />

              <LinhaDeInterruptor
                rotulo="Primeira vez na casa"
                nota={
                  primeiraVez
                    ? acolhimentoFeito
                      ? 'Conversa de acolhimento registrada.'
                      : 'Vai precisar da conversa de acolhimento antes de confirmar.'
                    : 'Já esteve aqui antes.'
                }
                ligado={primeiraVez}
                onAlternar={() => setPrimeiraVez((v) => !v)}
              />
            </Bloco>

            <EstadoDaAnamnese pessoa={pessoa} exigida={anamneseExigida} campo={campo} />

            <Contribuicao
              evento={evento}
              isento={isento}
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
              campo={campo}
            />

            <Bloco titulo="Hospedagem" campo={campo}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {evento.hospedagens.map((h) => (
                  <OpcaoEmLinha
                    key={h.tipo}
                    rotulo={h.rotulo}
                    nota={h.nota}
                    valor={h.valorDiaria > 0 ? `${formatarBRL(h.valorDiaria)} por dia` : 'sem custo'}
                    marcada={hospedagem === h.tipo}
                    campo={campo}
                    onEscolher={() => {
                      setHospedagem(h.tipo);
                      setLeitoAlocado(false);
                    }}
                  />
                ))}
              </div>
              {opcaoHosp.valorDiaria > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Select
                    label="Quantas diárias"
                    value={String(dias)}
                    onChange={(v) => setDias(Number(v))}
                    options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: pluralizar(n, 'diária') }))}
                  />
                  <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                    {formatarBRL(custoHospedagem)} de acomodação, <b>à parte da contribuição</b>.
                  </span>
                </div>
              ) : null}
            </Bloco>

            {evento.ocasiaoEspecial ? (
              <Bloco titulo="Alimentação" campo={campo}>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{evento.nota}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {evento.refeicoes.map((r) => (
                    <OpcaoEmLinha
                      key={r.refeicao}
                      rotulo={r.rotulo}
                      valor={formatarBRL(r.valor)}
                      marcada={refeicoes.includes(r.refeicao)}
                      multipla
                      campo={campo}
                      onEscolher={() =>
                        setRefeicoes((atual) =>
                          atual.includes(r.refeicao)
                            ? atual.filter((x) => x !== r.refeicao)
                            : [...atual, r.refeicao],
                        )
                      }
                    />
                  ))}
                </div>
              </Bloco>
            ) : (
              <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
                Sem bloco de alimentação: este é um trabalho de uma noite, e a casa só cobra refeição em ocasião
                especial. Quando não cobra, o campo não fica desabilitado — ele não existe.
              </span>
            )}

            <Bloco titulo="O que a casa precisa saber de todo mundo" campo={campo}>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                Obrigatórios inclusive para quem não consagra. É a única obrigatoriedade dura da inscrição.
              </span>
              <TextField
                label="Contato de emergência"
                placeholder="Nome e telefone de quem a casa liga"
                value={emergencia}
                density={campo ? 'field' : 'office'}
                onChange={(e) => setEmergencia(e.target.value)}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TextField
                  label="Restrições alimentares"
                  placeholder="O que não come, ou “nenhuma”"
                  value={restricoes}
                  density={campo ? 'field' : 'office'}
                  onChange={(e) => setRestricoes(e.target.value)}
                />
                {restricoes.trim() ? null : (
                  <Button variant="ghost" onClick={() => setRestricoes('Nenhuma')}>
                    Não tem nenhuma
                  </Button>
                )}
              </div>
            </Bloco>

            {pendencias.length > 0 ? <Pendencias lista={pendencias} campo={campo} /> : null}

            <Fechamento
              campo={campo}
              isento={isento}
              semValor={semValor}
              total={total}
              contribuicao={contribuicao}
              custoHospedagem={custoHospedagem}
              custoRefeicoes={custoRefeicoes}
              pendencias={pendencias.length}
              nome={pessoa.nome}
              onConfirmar={() => gravar(true)}
              onPendente={() => gravar(false)}
            />
          </>
        )}
      </div>
    </>
  );
}

/* ── Peças ───────────────────────────────────────────────────────────────── */

function Bloco({ titulo, campo, children }: { titulo: string; campo: boolean; children: ReactNode }) {
  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>{titulo}</Rotulo>
      {children}
    </Cartao>
  );
}

function EscolhaDoEvento({
  eventoId,
  onTrocar,
  campo,
}: {
  eventoId: string;
  onTrocar: (v: string) => void;
  campo: boolean;
}) {
  const evento = eventos.find((e) => (e.id as string) === eventoId)!;
  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <SeletorDeTipo
        opcoes={eventos.map((e) => ({ valor: e.id as string, label: e.abreviacao }))}
        valor={eventoId}
        onEscolher={onTrocar}
        densidade={campo ? 'field' : 'office'}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 14px', alignItems: 'baseline' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {evento.nome} — {evento.data}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{evento.local}</span>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {evento.inscritos} de {evento.capacidade} · {evento.leitosLivres} leitos livres
        </span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
        Nome e data juntos porque há mais de um trabalho no mesmo mês.
      </span>
    </Cartao>
  );
}

/**
 * O link da cerimônia. Fica em cima porque, na prática, é por ele que a maior
 * parte das inscrições entra: a recepção manda no WhatsApp e a pessoa se
 * cadastra e responde a própria anamnese. O que esta tela faz é o resto —
 * inscrever quem chegou por outro caminho e conferir o que já veio.
 */
function LinkDaCerimonia({
  campo,
  copiado,
  onCopiar,
}: {
  campo: boolean;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
        <Icon name="link" size={17} color="var(--color-ink-brand)" />
        <Rotulo>Link de inscrição desta cerimônia</Rotulo>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {linkDaCerimonia.aberturas} aberturas · {linkDaCerimonia.inscricoesPeloLink} inscrições
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <code style={{ font: 'var(--text-code)', color: 'var(--text-link)', wordBreak: 'break-all' }}>
          {linkDaCerimonia.url}
        </code>
        <Button variant={copiado ? 'quiet' : 'ghost'} iconName={copiado ? 'check' : 'copy'} onClick={onCopiar}>
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Gerado quando a cerimônia foi criada. A pessoa abre, declara o CPF, se cadastra se for a primeira vez e{' '}
        <b>responde a própria anamnese</b> — ninguém da casa preenche saúde por ninguém.
      </span>
    </Cartao>
  );
}

function BuscaDePessoa({
  busca,
  onBusca,
  onEscolher,
  campo,
}: {
  busca: string;
  onBusca: (v: string) => void;
  onEscolher: (p: PessoaDoDiretorio) => void;
  campo: boolean;
}) {
  const termo = busca.trim().toLowerCase();
  const achados = termo
    ? diretorio.filter((d) => d.nome.toLowerCase().includes(termo) || d.cidade.toLowerCase().includes(termo))
    : diretorio;

  return (
    <Bloco titulo="Quem vai" campo={campo}>
      <TextField
        label="Buscar no diretório"
        placeholder="Nome ou cidade"
        value={busca}
        density={campo ? 'field' : 'office'}
        onChange={(e) => onBusca(e.target.value)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {achados.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onEscolher(d)}
            style={{
              textAlign: 'left',
              border: 'var(--border-hairline)',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-card)',
              padding: campo ? '13px 14px' : '12px 15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              minHeight: campo ? 'var(--target-field)' : undefined,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{d.nome}</span>
              <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
                {d.vinculo} · {d.cidade}
              </span>
            </span>
            <StatusBadge tone={TOM_DA_ANAMNESE[d.anamnese]!}>{ANAMNESE_ROTULO[d.anamnese]}</StatusBadge>
            <Icon name="chevron-right" size={17} color="var(--text-meta)" />
          </button>
        ))}
        {achados.length === 0 ? (
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            Ninguém com esse nome. Quem chega pela primeira vez entra pelo cadastro rápido, e o cadastro é sempre
            humano — não há autoinscrição.
          </span>
        ) : null}
      </div>
    </Bloco>
  );
}

function PessoaEscolhida({
  pessoa,
  campo,
  onTrocar,
}: {
  pessoa: PessoaDoDiretorio;
  campo: boolean;
  onTrocar: () => void;
}) {
  return (
    <Cartao campo={campo} style={{ gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <Icon name="user-round" size={18} color="var(--color-ink-brand)" />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{pessoa.nome}</span>
        {pessoa.menorDeIdade ? <StatusBadge tone="suggest">Menor de idade</StatusBadge> : null}
        <span style={{ flex: 1 }} />
        <Button variant="quiet" iconName="arrow-left" onClick={onTrocar}>
          Trocar
        </Button>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {pessoa.vinculo} · {pessoa.cidade} · nasceu em {pessoa.nascimento}
      </span>
    </Cartao>
  );
}

function EstadoDaAnamnese({
  pessoa,
  exigida,
  campo,
}: {
  pessoa: PessoaDoDiretorio;
  exigida: boolean;
  campo: boolean;
}) {
  const emDia = pessoa.anamnese === 'OK';
  return (
    <Cartao campo={campo} style={{ gap: 9 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 10px' }}>
        <Rotulo>Anamnese</Rotulo>
        <StatusBadge tone={exigida ? TOM_DA_ANAMNESE[pessoa.anamnese]! : 'neutral'}>
          {exigida ? ANAMNESE_ROTULO[pessoa.anamnese] : 'Não se aplica'}
        </StatusBadge>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{pessoa.anamneseNota}</span>
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {exigida
          ? emDia
            ? 'Em dia.'
            : 'Enquanto não estiver em dia, a inscrição pode ser salva, mas não confirmada.'
          : 'Quem não consagra não precisa responder. O estado antigo continua guardado, apenas não se aplica a este trabalho.'}{' '}
        Esta tela mostra o estado, <b>nunca as respostas</b> — abrir a anamnese é outro ato, em outra tela, e fica
        registrado lá.
      </span>
    </Cartao>
  );
}

function Contribuicao({
  evento,
  isento,
  nivel,
  valor,
  onNivel,
  onValor,
  campo,
}: {
  evento: (typeof eventos)[number];
  isento: boolean;
  nivel: NivelDeContribuicao | null;
  valor: string;
  onNivel: (n: NivelDeContribuicao, valorFormatado: string) => void;
  onValor: (v: string) => void;
  campo: boolean;
}) {
  if (isento) {
    return (
      <Cartao campo={campo} style={{ gap: 9 }}>
        <Rotulo>Contribuição</Rotulo>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge tone="neutral">Isento</StatusBadge>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>
            Equipe não contribui financeiramente.
          </span>
        </div>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Isento não é zero. Zero seria alguém que devia e pagou nada; isento é quem o domínio diz que não deve — e a
          diferença aparece na soma do trabalho, onde a equipe não entra como inadimplência.
        </span>
      </Cartao>
    );
  }

  const escolhido = evento.contribuicoes.find((c) => c.nivel === nivel);
  const digitado = Math.round(Number(valor.replace(/\./g, '').replace(',', '.')) * 100) || 0;
  const social = evento.contribuicoes[0]!.valor;
  const prospero = evento.contribuicoes[2]!.valor;

  return (
    <Cartao campo={campo} style={{ gap: 12 }}>
      <Rotulo>Contribuição sugerida</Rotulo>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Três níveis definidos pelos padrinhos, referentes só à participação na cerimônia. <b>São sugestão, não
        preço</b>: o valor se conversa para menos conforme a condição de cada um, e quem quiser contribuir mais pode.
      </span>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: campo ? '1fr' : 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {evento.contribuicoes.map((c) => {
          const marcado = nivel === c.nivel;
          return (
            <button
              key={c.nivel}
              type="button"
              aria-pressed={marcado}
              onClick={() => onNivel(c.nivel, formatarDinheiro(c.valor))}
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
        label="Valor combinado"
        value={valor}
        density={campo ? 'field' : 'office'}
        placeholder="0,00"
        onChange={(e) => onValor(e.target.value)}
        hint="Sempre editável. Escolher um nível preenche este campo; o que vale é o que está aqui."
      />

      {digitado > 0 && digitado < social ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Abaixo do nível social — combinado com a pessoa. Não precisa de justificativa: a casa não cobra explicação
          de quem contribui com o que pode.
        </span>
      ) : null}
      {digitado > prospero ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--color-confirmed)' }}>
          Acima do próspero — contribuição voluntária além do sugerido.
        </span>
      ) : null}
      {escolhido && digitado === escolhido.valor ? (
        <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          No nível {escolhido.rotulo.toLowerCase()}.
        </span>
      ) : null}
    </Cartao>
  );
}

function LinhaDeInterruptor({
  rotulo,
  nota,
  ligado,
  onAlternar,
}: {
  rotulo: string;
  nota: string;
  ligado: boolean;
  onAlternar: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', paddingTop: 4 }}>
      <Interruptor ligado={ligado} onAlternar={onAlternar} rotuloAcessivel={rotulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rotulo}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      </div>
    </div>
  );
}

function OpcaoEmLinha({
  rotulo,
  nota,
  valor,
  marcada,
  multipla = false,
  campo,
  onEscolher,
}: {
  rotulo: string;
  nota?: string;
  valor: string;
  marcada: boolean;
  multipla?: boolean;
  campo: boolean;
  onEscolher: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      aria-label={rotulo}
      onClick={onEscolher}
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
          borderRadius: multipla ? 5 : '50%',
          border: `2px solid ${marcada ? 'var(--color-royal)' : 'var(--color-line-strong)'}`,
          background: marcada ? 'var(--color-royal)' : 'transparent',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {marcada ? <Icon name="check" size={11} color="var(--bg-card)" /> : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>{nota}</span> : null}
      </span>
      <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {valor}
      </span>
    </button>
  );
}

function Pendencias({ lista, campo }: { lista: readonly Pendencia[]; campo: boolean }) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: campo ? '14px 15px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Icon name="triangle-alert" size={19} color="var(--color-attention)" />
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {pluralizar(lista.length, 'pendência')} para confirmar
        </span>
      </div>

      {lista.map((p) => (
        <div
          key={p.chave}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-line)', paddingTop: 11 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 9px', alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{p.titulo}</span>
            <code style={{ font: 'var(--text-code)' }}>{p.invariante}</code>
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
            {p.detalhe}
          </span>
          {p.acao ? (
            <span>
              <Button variant="ghost" iconName="check" onClick={p.acao.ao}>
                {p.acao.rotulo}
              </Button>
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Fechamento({
  campo,
  isento,
  semValor,
  total,
  contribuicao,
  custoHospedagem,
  custoRefeicoes,
  pendencias,
  nome,
  onConfirmar,
  onPendente,
}: {
  campo: boolean;
  isento: boolean;
  semValor: boolean;
  total: number;
  contribuicao: number;
  custoHospedagem: number;
  custoRefeicoes: number;
  pendencias: number;
  nome: string;
  onConfirmar: () => void;
  onPendente: () => void;
}) {
  return (
    <Cartao campo={campo} style={{ gap: 13 }}>
      {isento ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>Isento</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>não há valor devido</span>
        </div>
      ) : semValor ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: 'var(--text-amount-lg)', color: 'var(--text-secondary)' }}>A combinar</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
            A inscrição pode existir antes da conversa sobre valor — e “a combinar” é mais honesto do que R$ 0,00, que
            diria que a pessoa não deve nada.
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span data-numeric style={{ font: 'var(--text-amount-lg)', color: 'var(--color-royal-deep)' }}>
              {formatarBRL(total)}
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>devidos</span>
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {formatarBRL(contribuicao)} de contribuição
            {custoHospedagem > 0 ? ` · ${formatarBRL(custoHospedagem)} de acomodação` : ''}
            {custoRefeicoes > 0 ? ` · ${formatarBRL(custoRefeicoes)} de alimentação` : ''}
          </span>
        </div>
      )}

      <Button
        fullWidth
        density={campo ? 'field' : 'office'}
        iconName="check-check"
        disabled={pendencias > 0}
        blockedReason={
          pendencias > 0
            ? `${pluralizar(pendencias, 'pendência')} acima impede${pendencias === 1 ? '' : 'm'} confirmar. Salvar como pendente sempre pode.`
            : undefined
        }
        onClick={onConfirmar}
      >
        Confirmar a inscrição de {nome.split(' ')[0]}
      </Button>

      <Button variant="quiet" fullWidth density={campo ? 'field' : 'office'} onClick={onPendente}>
        Salvar como pendente
      </Button>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '76ch' }}>
        O pagamento não se marca aqui. Quem recebe na recepção informa quanto, quando e por qual meio — a conta, a
        categoria e a competência vêm da configuração do evento, não de quem está com a pessoa na frente.
      </span>
    </Cartao>
  );
}
