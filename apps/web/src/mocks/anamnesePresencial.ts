import type {
  FormularioId,
  ModoDePreenchimento,
  Pergunta,
  PerguntaId,
  PerguntaPendente,
  PessoaId,
  RespostaHerdada,
} from '@cdd/contracts';
import { id } from './ids';

/**
 * `P-06` — o que a tela de campo recebe já mastigado pelo domínio.
 *
 * A v3 do formulário está publicada desde 12/06/2026. A v2 continua valendo
 * para quem respondeu nela e ainda está dentro dos doze meses — e é daí que
 * sai o delta: pergunta que só mudou de redação mantém o `PerguntaId` e não
 * volta a ser perguntada; pergunta que mudou de sentido ganhou id novo e
 * volta.
 */

const q = (n: string) => id<PerguntaId>(n);

export const VERSAO_VIGENTE = 3;
export const FORMULARIO_VIGENTE = id<FormularioId>('form-anamnese-v3');

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

export const PERGUNTAS_V3: readonly Pergunta[] = [
  p('q-medicacao', 'MEDICACAO_CONTINUA', 'Você faz uso de medicação contínua?', 'BOOLEANO', [], true, true, {
    quando: 'IGUAL',
    valor: 'Sim',
    mensagem: 'Uso de medicação contínua declarado',
  }),
  p(
    'q-medicacao-quais',
    'MEDICACAO_QUAIS',
    'Quais medicações e doses?',
    'TEXTO',
    [],
    false,
    true,
    { quando: 'PREENCHIDO', valor: null, mensagem: 'Medicação declarada — conferir interação' },
  ),
  p(
    'q-psiquiatrico-v3',
    'DIAGNOSTICO_PSIQUIATRICO',
    'Tem ou teve diagnóstico psiquiátrico?',
    'ESCOLHA_UNICA',
    ['Não', 'Sim, em acompanhamento', 'Sim, sem acompanhamento', 'Prefiro conversar pessoalmente'],
    true,
    true,
    { quando: 'DIFERENTE', valor: 'Não', mensagem: 'Diagnóstico psiquiátrico declarado' },
  ),
  p(
    'q-cardiaco-v3',
    'CONDICAO_CLINICA',
    'Tem alguma destas condições?',
    'ESCOLHA_MULTIPLA',
    ['Condição cardíaca', 'Hipertensão', 'Diabetes', 'Nenhuma delas'],
    true,
    true,
    { quando: 'DIFERENTE', valor: 'Nenhuma delas', mensagem: 'Condição clínica declarada' },
  ),
  p(
    'q-gestante-v3',
    'GESTACAO',
    'Está gestante ou amamentando?',
    'ESCOLHA_UNICA',
    ['Não', 'Gestante', 'Amamentando', 'Não se aplica'],
    true,
    true,
    { quando: 'IGUAL', valor: 'Gestante', mensagem: 'Gestante — participação fora do salão' },
  ),
  p(
    'q-substancias',
    'SUBSTANCIAS_72H',
    'Fez uso de álcool ou outras substâncias nos últimos 3 dias?',
    'BOOLEANO',
    [],
    true,
    true,
    { quando: 'IGUAL', valor: 'Sim', mensagem: 'Uso recente declarado' },
  ),
  p('q-experiencia', 'EXPERIENCIA_PREVIA', 'Já participou de trabalho com ayahuasca antes?', 'BOOLEANO', [], true, false, null),
  p('q-emergencia', 'CONTATO_EMERGENCIA', 'Contato de emergência (nome e telefone)', 'TEXTO', [], true, false, null),
  p(
    'q-livre',
    'CAMPO_LIVRE',
    'Alguma coisa que a casa precise saber e não foi perguntada?',
    'TEXTO',
    [],
    false,
    true,
    { quando: 'PREENCHIDO', valor: null, mensagem: 'Relato livre a ler no parecer' },
  ),
];

const porId = new Map(PERGUNTAS_V3.map((x) => [x.id as string, x]));
const pergunta = (n: string): Pergunta => porId.get(n)!;

/* ── A fila do dia ───────────────────────────────────────────────────────── */

export interface PessoaNaFila {
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly vinculo: string;
  readonly modo: ModoDePreenchimento;
  /** De qual versão veio a resposta anterior, quando existe. */
  readonly versaoAnterior: number | null;
  readonly respondidaEm: string | null;
  readonly validaAte: string | null;
  readonly pendentes: readonly PerguntaPendente[];
  readonly herdadas: readonly RespostaHerdada[];
  readonly observacao: string | null;
}

const novaNaV3 = (n: string): PerguntaPendente => ({
  pergunta: pergunta(n),
  motivo: { tipo: 'NOVA_NA_VERSAO', versao: 3 },
});

const substituiu = (n: string, textoAnterior: string): PerguntaPendente => ({
  pergunta: pergunta(n),
  motivo: { tipo: 'SUBSTITUIU', textoAnterior },
});

const inteiro = (motivo: 'PRIMEIRA_VEZ' | 'REVALIDACAO'): readonly PerguntaPendente[] =>
  PERGUNTAS_V3.map((x) => ({ pergunta: x, motivo: { tipo: motivo } as const }));

/**
 * Clarice respondeu a v2 em 20/11/2025, antes de a v3 existir, e ainda está
 * dentro dos doze meses. É o único caso em que o delta aparece — e o que ele
 * mostra é que duas das cinco perguntas da v2 atravessaram intactas.
 */
export const fila: readonly PessoaNaFila[] = [
  {
    pessoaId: id<PessoaId>('p-5'),
    nome: 'Marina Tavares',
    vinculo: 'Visitante · primeira vez na casa',
    modo: 'PRIMEIRA_VEZ',
    versaoAnterior: null,
    respondidaEm: null,
    validaAte: null,
    pendentes: inteiro('PRIMEIRA_VEZ'),
    herdadas: [],
    observacao: 'Nunca respondeu. O formulário vem inteiro porque não há o que comparar.',
  },
  {
    pessoaId: id<PessoaId>('p-clarice'),
    nome: 'Clarice Fontes',
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
      {
        perguntaId: q('q-medicacao'),
        texto: 'Você faz uso de medicação contínua?',
        valor: 'Sim',
        deVersao: 2,
      },
      {
        perguntaId: q('q-emergencia'),
        texto: 'Contato de emergência (nome e telefone)',
        valor: 'Bento Fontes · (11) 99420-7781',
        deVersao: 2,
      },
    ],
    observacao: 'Respondeu a v2 e continua dentro da validade. Só o que mudou volta a ser perguntado.',
  },
  {
    pessoaId: id<PessoaId>('p-4'),
    nome: 'Eduardo Pires',
    vinculo: 'Frequentador desde 2022',
    modo: 'REVALIDACAO_COMPLETA',
    versaoAnterior: 2,
    respondidaEm: '11/03/2024',
    validaAte: '11/03/2025',
    pendentes: inteiro('REVALIDACAO'),
    herdadas: [],
    observacao: 'Resposta vencida há mais de um ano. Nada se aproveita — nem o que a redação manteve igual.',
  },
  {
    pessoaId: id<PessoaId>('p-7'),
    nome: 'Helena Duarte',
    vinculo: 'Frequentadora desde 2019',
    modo: 'EM_DIA',
    versaoAnterior: 3,
    respondidaEm: '28/07/2026',
    validaAte: '28/07/2027',
    pendentes: [],
    herdadas: [],
    observacao: 'Respondeu a versão vigente há pouco. Não há o que preencher, e a tela não inventa o que perguntar.',
  },
];

export const MODO_ROTULO: Record<ModoDePreenchimento, string> = {
  PRIMEIRA_VEZ: 'Formulário inteiro',
  INCREMENTAL: 'Só o que mudou',
  REVALIDACAO_COMPLETA: 'Revalidação completa',
  EM_DIA: 'Em dia',
};

/** O trabalho para o qual a fila foi montada. */
export const trabalhoDoDia = {
  titulo: 'Trabalho de 12/09',
  local: 'Chácara · Ibiúna',
  inscritos: 34,
} as const;
