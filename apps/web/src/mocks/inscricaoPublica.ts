import type {
  FormularioId,
  LinkDeInscricao,
  ModoDePreenchimento,
  Pergunta,
  PerguntaId,
  PerguntaPendente,
  PessoaId,
  RespostaHerdada,
} from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { id } from './ids';
import { eventos } from './inscricao';

/**
 * Inscrição pelo link da cerimônia — o que a pessoa recebe no WhatsApp.
 *
 * Duas correções de premissa vindas da coordenação, ambas contra o que os
 * documentos diziam:
 *
 * 1. **Não existe anamnese presencial.** Quem responde é o próprio
 *    participante, online, durante a inscrição.
 * 2. **Autoinscrição existe.** O Doc 1 §1.3 registrava a ausência dela como
 *    decisão da casa; não era. O que a casa quer humanizado é o atendimento
 *    da recepção — que acontece no WhatsApp, e é de lá que o link sai.
 *
 * O reconhecimento é por CPF: quem já se cadastrou antes só responde o que
 * mudou e declara que o resto segue verdadeiro; quem nunca veio faz o
 * cadastro e responde o formulário inteiro.
 */

const q = (n: string) => id<PerguntaId>(n);

export const VERSAO_VIGENTE = 3;
export const FORMULARIO_VIGENTE = id<FormularioId>('form-anamnese-v3');

/** A cerimônia deste link. O primeiro evento do mock de `E-06`. */
export const eventoDoLink = eventos[0]!;

export const linkDaCerimonia: LinkDeInscricao = {
  eventoId: eventoDoLink.id,
  token: 'lua-cheia-1209-7k3f',
  url: 'ceudodespertar.org/i/lua-cheia-1209-7k3f',
  criadoEm: dataLocal('2026-08-14'),
  inscricoesAbertas: true,
  aberturas: 96,
  inscricoesPeloLink: 34,
};

const p = (
  perguntaId: string,
  codigo: string,
  texto: string,
  tipo: Pergunta['tipo'],
  opcoes: readonly string[],
  obrigatoria: boolean,
  sensivel: boolean,
  alerta: Pergunta['regraDeAlerta'],
): Pergunta => ({ id: q(perguntaId), codigo, texto, tipo, opcoes, obrigatoria, sensivel, regraDeAlerta: alerta });

/** Perguntas em segunda pessoa: quem lê é quem responde. */
export const PERGUNTAS_V3: readonly Pergunta[] = [
  p('q-medicacao', 'MEDICACAO_CONTINUA', 'Você faz uso de medicação contínua?', 'BOOLEANO', [], true, true, {
    quando: 'IGUAL',
    valor: 'Sim',
    mensagem: 'Uso de medicação contínua declarado',
  }),
  p('q-medicacao-quais', 'MEDICACAO_QUAIS', 'Quais medicações e doses?', 'TEXTO', [], false, true, {
    quando: 'PREENCHIDO',
    valor: null,
    mensagem: 'Medicação declarada — conferir interação',
  }),
  p(
    'q-psiquiatrico-v3',
    'DIAGNOSTICO_PSIQUIATRICO',
    'Você tem ou já teve diagnóstico psiquiátrico?',
    'ESCOLHA_UNICA',
    ['Não', 'Sim, em acompanhamento', 'Sim, sem acompanhamento', 'Prefiro conversar pessoalmente'],
    true,
    true,
    { quando: 'DIFERENTE', valor: 'Não', mensagem: 'Diagnóstico psiquiátrico declarado' },
  ),
  p(
    'q-cardiaco-v3',
    'CONDICAO_CLINICA',
    'Você tem alguma destas condições?',
    'ESCOLHA_MULTIPLA',
    ['Condição cardíaca', 'Hipertensão', 'Diabetes', 'Nenhuma delas'],
    true,
    true,
    { quando: 'DIFERENTE', valor: 'Nenhuma delas', mensagem: 'Condição clínica declarada' },
  ),
  p(
    'q-gestante-v3',
    'GESTACAO',
    'Você está gestante ou amamentando?',
    'ESCOLHA_UNICA',
    ['Não', 'Gestante', 'Amamentando', 'Não se aplica'],
    true,
    true,
    { quando: 'IGUAL', valor: 'Gestante', mensagem: 'Gestante — participação fora do salão' },
  ),
  p(
    'q-substancias',
    'SUBSTANCIAS_72H',
    'Você fez uso de álcool ou outras substâncias nos últimos 3 dias?',
    'BOOLEANO',
    [],
    true,
    true,
    { quando: 'IGUAL', valor: 'Sim', mensagem: 'Uso recente declarado' },
  ),
  p('q-experiencia', 'EXPERIENCIA_PREVIA', 'Você já participou de trabalho com ayahuasca antes?', 'BOOLEANO', [], true, false, null),
  p('q-emergencia', 'CONTATO_EMERGENCIA', 'Contato de emergência (nome e telefone)', 'TEXTO', [], true, false, null),
  p(
    'q-livre',
    'CAMPO_LIVRE',
    'Tem alguma coisa que a casa precise saber e não foi perguntada?',
    'TEXTO',
    [],
    false,
    true,
    { quando: 'PREENCHIDO', valor: null, mensagem: 'Relato livre a ler no parecer' },
  ),
];

const porId = new Map(PERGUNTAS_V3.map((x) => [x.id as string, x]));
const pergunta = (n: string): Pergunta => porId.get(n)!;

/* ── Quem o CPF encontra ─────────────────────────────────────────────────── */

export interface CadastroEncontrado {
  readonly pessoaId: PessoaId;
  readonly cpf: string;
  readonly nome: string;
  /** Só o primeiro nome aparece antes de a pessoa confirmar que é ela. */
  readonly primeiroNome: string;
  readonly vinculo: string;
  readonly modo: ModoDePreenchimento;
  readonly versaoAnterior: number | null;
  readonly respondidaEm: string | null;
  readonly validaAte: string | null;
  readonly pendentes: readonly PerguntaPendente[];
  readonly herdadas: readonly RespostaHerdada[];
  readonly jaParticipou: boolean;
  readonly contatoEmergencia: string | null;
  readonly restricoes: string | null;
  readonly explicacao: string;
}

const novaNaV3 = (n: string): PerguntaPendente => ({
  pergunta: pergunta(n),
  motivo: { tipo: 'NOVA_NA_VERSAO', versao: 3 },
});

const substituiu = (n: string, textoAnterior: string): PerguntaPendente => ({
  pergunta: pergunta(n),
  motivo: { tipo: 'SUBSTITUIU', textoAnterior },
});

export const formularioInteiro = (
  motivo: 'PRIMEIRA_VEZ' | 'REVALIDACAO',
): readonly PerguntaPendente[] => PERGUNTAS_V3.map((x) => ({ pergunta: x, motivo: { tipo: motivo } as const }));

/**
 * Clarice respondeu a v2 em 20/11/2025, antes de a v3 existir, e ainda está
 * dentro dos doze meses. É o único caso em que o delta aparece — e o que ele
 * mostra é que duas das cinco perguntas da v2 atravessaram intactas.
 */
export const cadastros: readonly CadastroEncontrado[] = [
  {
    pessoaId: id<PessoaId>('p-clarice'),
    cpf: '529.187.340-11',
    nome: 'Clarice Fontes',
    primeiroNome: 'Clarice',
    vinculo: 'Frequentadora desde 2023',
    modo: 'INCREMENTAL',
    versaoAnterior: 2,
    respondidaEm: '20/11/2025',
    validaAte: '20/11/2026',
    pendentes: [
      novaNaV3('q-medicacao-quais'),
      substituiu('q-psiquiatrico-v3', 'Tem diagnóstico psiquiátrico?'),
      substituiu('q-cardiaco-v3', 'Tem condição cardíaca?'),
      substituiu('q-gestante-v3', 'Está gestante?'),
      novaNaV3('q-substancias'),
      novaNaV3('q-experiencia'),
      novaNaV3('q-livre'),
    ],
    herdadas: [
      { perguntaId: q('q-medicacao'), texto: 'Você faz uso de medicação contínua?', valor: 'Sim', deVersao: 2 },
      {
        perguntaId: q('q-emergencia'),
        texto: 'Contato de emergência (nome e telefone)',
        valor: 'Bento Fontes · (11) 99420-7781',
        deVersao: 2,
      },
    ],
    jaParticipou: true,
    contatoEmergencia: 'Bento Fontes · (11) 99420-7781',
    restricoes: null,
    explicacao: 'Você já respondeu antes e continua no prazo. A casa só pergunta o que mudou desde então.',
  },
  {
    pessoaId: id<PessoaId>('p-4'),
    cpf: '812.445.290-07',
    nome: 'Eduardo Pires',
    primeiroNome: 'Eduardo',
    vinculo: 'Frequentador desde 2022',
    modo: 'REVALIDACAO_COMPLETA',
    versaoAnterior: 2,
    respondidaEm: '11/03/2024',
    validaAte: '11/03/2025',
    pendentes: formularioInteiro('REVALIDACAO'),
    herdadas: [],
    jaParticipou: true,
    contatoEmergencia: 'Silvia Pires · (11) 99933-1200',
    restricoes: null,
    explicacao:
      'Sua última resposta venceu. Saúde muda com o tempo, então o formulário volta inteiro — nada do que você respondeu em 2024 é reaproveitado.',
  },
  {
    pessoaId: id<PessoaId>('p-7'),
    cpf: '330.918.775-42',
    nome: 'Helena Duarte',
    primeiroNome: 'Helena',
    vinculo: 'Frequentadora desde 2019',
    modo: 'EM_DIA',
    versaoAnterior: 3,
    respondidaEm: '28/07/2026',
    validaAte: '28/07/2027',
    pendentes: [],
    herdadas: [],
    jaParticipou: true,
    contatoEmergencia: 'Paulo Duarte · (11) 99000-8877',
    restricoes: 'Não come carne vermelha',
    explicacao:
      'Sua anamnese está em dia na versão atual. Não há nada novo a responder — só confirmar que continua valendo para este trabalho.',
  },
];

export const MODO_RECADO: Record<ModoDePreenchimento, string> = {
  PRIMEIRA_VEZ: 'Primeira vez por aqui',
  INCREMENTAL: 'Só o que mudou',
  REVALIDACAO_COMPLETA: 'Resposta vencida',
  EM_DIA: 'Anamnese em dia',
};

/** CPF de exemplo que a tela oferece, porque protótipo ninguém decora. */
export const CPFS_DE_EXEMPLO: readonly { cpf: string; descricao: string }[] = [
  { cpf: '529.187.340-11', descricao: 'já cadastrada, responde só o que mudou' },
  { cpf: '330.918.775-42', descricao: 'já cadastrada, anamnese em dia' },
  { cpf: '812.445.290-07', descricao: 'já cadastrado, resposta vencida' },
  { cpf: '000.000.000-00', descricao: 'ninguém — cai no cadastro novo' },
];

export const TEXTO_DA_DECLARACAO =
  'Declaro que as informações da minha anamnese seguem verdadeiras para este trabalho e que avisarei a casa se algo mudar até a data.';
