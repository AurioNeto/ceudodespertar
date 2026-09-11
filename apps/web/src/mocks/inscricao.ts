import type {
  ContribuicaoSugerida,
  EventoId,
  OpcaoDeHospedagem,
  OpcaoDeRefeicao,
  PessoaId,
  StatusAcolhimento,
  StatusAnamnese,
  TipoParticipacao,
} from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * `E-06` — o que a tela de inscrição precisa saber antes de existir.
 *
 * Dois eventos de propósito: um trabalho comum de uma noite e uma jornada de
 * três dias. A diferença entre eles é a única razão de o bloco de alimentação
 * aparecer ou não — a casa só cobra refeição em ocasião especial, e o que não
 * se cobra não vira campo desabilitado, vira ausência.
 */

export interface EventoParaInscricao {
  readonly id: EventoId;
  readonly nome: string;
  readonly data: string;
  /** Rótulo curto do seletor — a data por extenso não cabe num botão. */
  readonly abreviacao: string;
  readonly local: string;
  readonly capacidade: number;
  readonly inscritos: number;
  readonly leitosLivres: number;
  /** Jornada, retiro — o que justifica cobrar alimentação. */
  readonly ocasiaoEspecial: boolean;
  readonly contribuicoes: readonly ContribuicaoSugerida[];
  readonly hospedagens: readonly OpcaoDeHospedagem[];
  readonly refeicoes: readonly OpcaoDeRefeicao[];
  readonly nota: string;
}

const NIVEIS = (social: number, sustentavel: number, prospero: number): readonly ContribuicaoSugerida[] => [
  {
    nivel: 'SOCIAL',
    rotulo: 'Social',
    valor: reais(social),
    explicacao: 'Para quem está com a condição apertada. Ninguém precisa explicar por que escolheu este.',
  },
  {
    nivel: 'SUSTENTAVEL',
    rotulo: 'Sustentável',
    valor: reais(sustentavel),
    explicacao: 'O que cobre o custo do trabalho por pessoa. É a referência da casa.',
  },
  {
    nivel: 'PROSPERO',
    rotulo: 'Próspero',
    valor: reais(prospero),
    explicacao: 'Para quem pode sustentar a própria participação e um pouco da de outra pessoa.',
  },
];

const HOSPEDAGENS: readonly OpcaoDeHospedagem[] = [
  {
    tipo: 'SEM_HOSPEDAGEM',
    rotulo: 'Não vai dormir na casa',
    valorDiaria: reais(0),
    nota: 'Vai embora depois do trabalho.',
    ocupaLeito: false,
  },
  {
    tipo: 'COLCHONETE',
    rotulo: 'Colchonete próprio na igreja',
    valorDiaria: reais(0),
    nota: 'Grátis. Não entra na contribuição nem gera lançamento — a casa só precisa saber quem fica.',
    ocupaLeito: false,
  },
  {
    tipo: 'BELICHE',
    rotulo: 'Beliche no dormitório',
    valorDiaria: reais(50),
    nota: 'Pago à parte por quem usa a acomodação.',
    ocupaLeito: true,
  },
  {
    tipo: 'QUARTO',
    rotulo: 'Quarto',
    valorDiaria: reais(90),
    nota: 'Pago à parte por quem usa a acomodação.',
    ocupaLeito: true,
  },
];

export const eventos: readonly EventoParaInscricao[] = [
  {
    id: id<EventoId>('e-trabalho-1209'),
    nome: 'Trabalho de Lua Cheia',
    data: '12/09/2026',
    abreviacao: 'Lua Cheia · 12/09',
    local: 'Chácara · Ibiúna',
    capacidade: 60,
    inscritos: 34,
    leitosLivres: 6,
    ocasiaoEspecial: false,
    contribuicoes: NIVEIS(80, 160, 240),
    hospedagens: HOSPEDAGENS,
    refeicoes: [],
    nota: 'Trabalho de uma noite. A casa não cobra alimentação — por isso não há o que escolher aqui.',
  },
  {
    id: id<EventoId>('e-jornada-2410'),
    nome: 'Jornada de três dias',
    data: '24 a 26/10/2026',
    abreviacao: 'Jornada · 24–26/10',
    local: 'Chácara · Ibiúna',
    capacidade: 40,
    inscritos: 18,
    leitosLivres: 11,
    ocasiaoEspecial: true,
    contribuicoes: NIVEIS(180, 360, 540),
    hospedagens: HOSPEDAGENS,
    refeicoes: [
      { refeicao: 'CEIA', rotulo: 'Ceia', valor: reais(20) },
      { refeicao: 'CAFE', rotulo: 'Café da manhã', valor: reais(18) },
      { refeicao: 'ALMOCO', rotulo: 'Almoço', valor: reais(35) },
      { refeicao: 'JANTAR', rotulo: 'Jantar', valor: reais(30) },
    ],
    nota: 'Ocasião especial: três dias com a casa servindo as refeições, e por isso elas são cobradas.',
  },
];

/* ── Diretório, do jeito que a busca da tela devolve ─────────────────────── */

export interface PessoaDoDiretorio {
  readonly id: PessoaId;
  readonly nome: string;
  readonly vinculo: string;
  readonly cidade: string;
  readonly nascimento: string;
  readonly menorDeIdade: boolean;
  readonly anamnese: StatusAnamnese;
  readonly anamneseNota: string;
  readonly jaParticipou: boolean;
  readonly acolhimento: StatusAcolhimento;
  readonly contatoEmergencia: string | null;
  readonly restricoes: string | null;
  /** Quem pode figurar como responsável de uma criança estelar. */
  readonly responsavelDe: readonly string[];
  /** Autorização de responsável vigente para o trabalho de 12/09 (IN2). */
  readonly autorizacaoVigente: boolean;
}

export const diretorio: readonly PessoaDoDiretorio[] = [
  {
    id: id<PessoaId>('p-7'),
    nome: 'Helena Duarte',
    vinculo: 'Frequentadora desde 2019',
    cidade: 'São Roque · SP',
    nascimento: '22/02/1996',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 28/07/2026 · v3 · vale até 28/07/2027',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Paulo Duarte · (11) 99000-8877',
    restricoes: 'Não come carne vermelha',
    responsavelDe: ['Antônio Duarte'],
    autorizacaoVigente: true,
  },
  {
    id: id<PessoaId>('p-5'),
    nome: 'Marina Tavares',
    vinculo: 'Visitante',
    cidade: 'Rio de Janeiro · RJ',
    nascimento: '05/06/1991',
    menorDeIdade: false,
    anamnese: 'PENDENTE',
    anamneseNota: 'Nunca respondeu',
    jaParticipou: false,
    acolhimento: 'PENDENTE',
    contatoEmergencia: 'Luiz Tavares · (21) 98800-4411',
    restricoes: null,
    responsavelDe: [],
    autorizacaoVigente: false,
  },
  {
    id: id<PessoaId>('p-4'),
    nome: 'Eduardo Pires',
    vinculo: 'Frequentador desde 2022',
    cidade: 'São Paulo · SP',
    nascimento: '19/11/1993',
    menorDeIdade: false,
    anamnese: 'VENCIDA',
    anamneseNota: 'Respondida em 11/03/2024 · v2 · venceu em 11/03/2025',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Silvia Pires · (11) 99933-1200',
    restricoes: null,
    responsavelDe: [],
    autorizacaoVigente: false,
  },
  {
    id: id<PessoaId>('p-6'),
    nome: 'Sérgio Bittencourt',
    vinculo: 'Fardado desde 2011 · guardião',
    cidade: 'Vargem Grande · SP',
    nascimento: '30/08/1968',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 01/08/2026 · v3 · vale até 01/08/2027',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Neide Bittencourt · (11) 98811-0099',
    restricoes: 'Evitar jejum prolongado',
    responsavelDe: [],
    autorizacaoVigente: false,
  },
  {
    id: id<PessoaId>('p-antonio'),
    nome: 'Antônio Duarte',
    vinculo: 'Criança · filho de Helena Duarte',
    cidade: 'São Roque · SP',
    nascimento: '14/03/2019',
    menorDeIdade: true,
    anamnese: 'PENDENTE',
    anamneseNota: 'Nunca respondeu',
    jaParticipou: true,
    acolhimento: 'NAO_NECESSARIO',
    contatoEmergencia: 'Helena Duarte · (11) 98444-2210',
    restricoes: 'Alergia a amendoim',
    responsavelDe: [],
    autorizacaoVigente: false,
  },
  {
    id: id<PessoaId>('p-bruna'),
    nome: 'Bruna Camargo',
    vinculo: 'Visitante',
    cidade: 'Campinas · SP',
    nascimento: '08/12/1999',
    menorDeIdade: false,
    anamnese: 'OK',
    anamneseNota: 'Respondida em 30/08/2026 · v3 · vale até 30/08/2027',
    jaParticipou: false,
    acolhimento: 'REALIZADO',
    contatoEmergencia: 'Tais Camargo · (19) 99888-1122',
    restricoes: 'Vegetariana',
    responsavelDe: [],
    autorizacaoVigente: false,
  },
];

export const TIPO_ROTULO: Record<TipoParticipacao, string> = {
  PARTICIPANTE: 'Participante',
  CONVIDADO: 'Convidado',
  EQUIPE: 'Equipe',
  CRIANCA_ESTELAR: 'Criança estelar',
};

export const TIPO_EXPLICACAO: Record<TipoParticipacao, string> = {
  PARTICIPANTE: 'Quem vem participar do trabalho. Contribui e faz anamnese.',
  CONVIDADO: 'Convidado da casa ou de alguém da casa. Contribui e faz anamnese.',
  EQUIPE: 'Guardião, cuidadora, músico, cozinha. Não contribui — é isento, e isento não é zero.',
  CRIANCA_ESTELAR: 'Criança. Exige responsável, modalidade e autorização vigente para este trabalho.',
};

/** Doc 2, IN11: o padrão de `consagra` vem do tipo, e é editável. */
export const CONSAGRA_POR_PADRAO: Record<TipoParticipacao, boolean> = {
  PARTICIPANTE: true,
  CONVIDADO: true,
  EQUIPE: true,
  CRIANCA_ESTELAR: false,
};

export const ANAMNESE_ROTULO: Record<StatusAnamnese, string> = {
  OK: 'Em dia',
  PENDENTE: 'Pendente',
  VENCIDA: 'Vencida',
  NAO_APLICAVEL: 'Não se aplica',
};
