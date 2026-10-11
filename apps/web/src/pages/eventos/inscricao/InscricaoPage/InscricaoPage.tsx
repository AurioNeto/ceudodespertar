import { useMemo, useState } from 'react';
import type {
  Hospedagem,
  ModalidadeCrianca,
  NivelDeContribuicao,
  Refeicao,
  TipoParticipacao,
} from '@cdd/contracts';
import {
  Button,
  Icon,
  ScreenHeader,
  TextField,
  useDensidade,
  Select,
  SeletorDeTipo,
  Recado,
} from '@/ds';
import { formatarBRL, pluralizar } from '@/pages/utils/formato';
import { CONSAGRA_POR_PADRAO, TIPO_EXPLICACAO, TIPO_ROTULO } from './constantes';
import type { Pendencia } from './tipos';
import { diretorio, type PessoaDoDiretorio } from './mocks/inscricao';
import { eventos } from '../mocks/eventos';
import { Bloco } from './components/Bloco';
import { BuscaDePessoa } from './components/BuscaDePessoa';
import { Contribuicao } from './components/Contribuicao';
import { EscolhaDoEvento } from './components/EscolhaDoEvento';
import { EstadoDaAnamnese } from './components/EstadoDaAnamnese';
import { Fechamento } from './components/Fechamento';
import { LinhaDeInterruptor } from './components/LinhaDeInterruptor';
import { LinkDaCerimonia } from './components/LinkDaCerimonia';
import { Pendencias } from './components/Pendencias';
import { PessoaEscolhida } from './components/PessoaEscolhida';

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
          densidade={densidade}
        />

        <LinkDaCerimonia densidade={densidade} copiado={linkCopiado} onCopiar={() => setLinkCopiado(true)} />

        {pessoa === null ? (
          <BuscaDePessoa busca={busca} onBusca={setBusca} onEscolher={escolher} densidade={densidade} />
        ) : (
          <>
            <PessoaEscolhida pessoa={pessoa} densidade={densidade} onTrocar={() => setPessoa(null)} />

            <Bloco titulo="Como participa" densidade={densidade}>
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

            <EstadoDaAnamnese pessoa={pessoa} exigida={anamneseExigida} densidade={densidade} />

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
              densidade={densidade}
            />

            <Bloco titulo="Hospedagem" densidade={densidade}>
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
              <Bloco titulo="Alimentação" densidade={densidade}>
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

            <Bloco titulo="O que a casa precisa saber de todo mundo" densidade={densidade}>
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

            {pendencias.length > 0 ? <Pendencias lista={pendencias} densidade={densidade} /> : null}

            <Fechamento
              densidade={densidade}
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
