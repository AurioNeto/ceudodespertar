import type { ContribuicaoSugerida, EventoId, OpcaoDeHospedagem, OpcaoDeRefeicao } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { id } from '@/mocks/ids';

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
