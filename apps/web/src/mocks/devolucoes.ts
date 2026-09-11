import type { Competencia, DevolucaoId, Dinheiro, EventoId, InscricaoId, PessoaId } from '@cdd/contracts';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * `E-09` — a fila da Tesouraria.
 *
 * O que chega aqui já passou pelo Acolhimento: alguém cancelou a inscrição e
 * registrou que a pessoa **pediu** o dinheiro de volta. Quem apenas faltou não
 * aparece — DV1 é explícito, e a tela mostra os que faltaram sem pedir como
 * contexto, nunca como trabalho.
 */

export interface DevolucaoNaFila {
  readonly id: DevolucaoId;
  readonly inscricaoId: InscricaoId | null;
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly evento: string;
  readonly dataDoEvento: string;
  readonly valor: Dinheiro;
  readonly pagouEm: string;
  readonly meioDoPagamento: string;
  readonly solicitadaEm: string;
  readonly solicitadaPor: string;
  readonly motivo: string;
  /** O lançamento de receita que entrou quando ela pagou. */
  readonly lancamentoOriginal: string;
  readonly competenciaOriginal: Competencia;
  /** Se o período da receita original já fechou, o estorno vai para o atual. */
  readonly competenciaFechada: boolean;
  /** Devolução a contratante, não a participante (CN4). */
  readonly aContratante: boolean;
}

const dev = (n: string) => id<DevolucaoId>(n);

export const fila: readonly DevolucaoNaFila[] = [
  {
    id: dev('d-01'),
    inscricaoId: id<InscricaoId>('i-441'),
    eventoId: id<EventoId>('e-trabalho-2208'),
    pessoaId: id<PessoaId>('p-2'),
    nome: 'Carlos Menezes',
    evento: 'Trabalho de Cura',
    dataDoEvento: '22/08/2026',
    valor: reais(210),
    pagouEm: '14/08/2026',
    meioDoPagamento: 'Pix · Cora PJ',
    solicitadaEm: '25/08/2026',
    solicitadaPor: 'Márcia Lemos · Acolhimento',
    motivo: 'Internação da mãe na véspera. Avisou no mesmo dia e pediu o valor de volta.',
    lancamentoOriginal: 'lanc-8712',
    competenciaOriginal: competencia('2026-08'),
    competenciaFechada: false,
    aContratante: false,
  },
  {
    id: dev('d-02'),
    inscricaoId: id<InscricaoId>('i-402'),
    eventoId: id<EventoId>('e-jornada-julho'),
    pessoaId: id<PessoaId>('p-10'),
    nome: 'Otávio Lins',
    evento: 'Jornada de julho',
    dataDoEvento: '18/07/2026',
    valor: reais(540),
    pagouEm: '02/07/2026',
    meioDoPagamento: 'Pix · Cora PJ',
    solicitadaEm: '19/07/2026',
    solicitadaPor: 'Joana Ribeiro · Acolhimento',
    motivo: 'Não conseguiu vir. Pediu a devolução no dia seguinte e ainda não recebeu.',
    lancamentoOriginal: 'lanc-8390',
    competenciaOriginal: competencia('2026-07'),
    competenciaFechada: true,
    aContratante: false,
  },
  {
    id: dev('d-03'),
    inscricaoId: null,
    eventoId: id<EventoId>('e-contratada-agosto'),
    pessoaId: id<PessoaId>('p-instituto'),
    nome: 'Instituto Semente Viva',
    evento: 'Cerimônia contratada',
    dataDoEvento: '30/08/2026',
    valor: reais(1800),
    pagouEm: '10/08/2026',
    meioDoPagamento: 'Transferência · Cora PJ',
    solicitadaEm: '28/08/2026',
    solicitadaPor: 'Teresa Andrade · Governança',
    motivo: 'Contratação cancelada pelo contratante com dois dias de antecedência. Sinal integral a devolver.',
    lancamentoOriginal: 'lanc-8801',
    competenciaOriginal: competencia('2026-08'),
    competenciaFechada: false,
    aContratante: true,
  },
];

/**
 * Contexto de DV1, e só isso. São pessoas que faltaram e **não** pediram nada:
 * não há trabalho a fazer com elas, e a tela existe para deixar isso visível
 * em vez de deixar a dúvida no ar.
 */
export const faltaramSemPedir: readonly { nome: string; evento: string; valor: Dinheiro }[] = [
  { nome: 'Rosa Silveira', evento: 'Trabalho de Cura · 22/08', valor: reais(160) },
  { nome: 'Tobias Aguiar', evento: 'Trabalho de Cura · 22/08', valor: reais(80) },
  { nome: 'Bruna Camargo', evento: 'Jornada de julho · 18/07', valor: reais(360) },
];

/** Devoluções já pagas, para a tela não ser só fila. */
export const pagas: readonly {
  id: DevolucaoId;
  nome: string;
  evento: string;
  valor: Dinheiro;
  pagaEm: string;
  conta: string;
  estorno: string;
}[] = [
  {
    id: dev('d-00'),
    nome: 'Helena Duarte',
    evento: 'Concentração · 12/07',
    valor: reais(160),
    pagaEm: '24/07/2026',
    conta: 'Cora PJ',
    estorno: 'est-8402',
  },
];

export const hojeNaTesouraria = dataLocal('2026-09-11');
