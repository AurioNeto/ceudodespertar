import { reais, type Dinheiro } from '@cdd/contracts';

/** Resumo da próxima cerimônia — o primeiro painel do carrossel do Painel. */
export const proximaCerimonia = {
  data: '2026-09-05',
  emDias: 8,
  nome: 'Cerimônia Mãe Divina',
  horario: 'sexta, 20h · abertura 18h30',
  dirigente: 'Marcia Zubek',
  leitosOcupados: 24,
  leitos: 30,
  inscritos: 78,
  capacidade: 90,
  semPagamento: 19,
  aReceber: reais(2850),
  aReceberAte: '2026-09-04',
  primeiraVezNaCasa: 11,
  primeiraVezNaAyahuasca: 6,
  anamnesePendente: 14,
  anamneseEntregue: 64,
  pontosDeAtencao: [
    { nome: 'Renata Salles', nota: '— uso contínuo de sertralina, redução em curso com a médica' },
    { nome: 'Wilson Prado', nota: '— pressão alta, medicação diária; pediu para não jejuar' },
    { nome: 'Ana Beatriz Rocha', nota: '— crise de ansiedade na última cerimônia; primeira vez sem acompanhante' },
  ],
} as const;

export const ultimaCerimonia = {
  data: '2026-08-22',
  nome: 'Mãe Divina',
  participantes: 84,
  contasFechadasEm: '2026-08-24',
  dirigente: 'Marcia Zubek',
  contribuicoes: reais(18940),
  custos: reais(7412.3),
  resultado: reais(11527.7),
  mediaPorParticipante: reais(225.48),
  litrosServidos: 11.2,
} as const;

export interface CerimoniaPassada {
  readonly data: string;
  readonly nome: string;
  readonly resultado: Dinheiro;
  /** Litros consumidos por lote, na ordem de `lotesDeDaime`. */
  readonly consumo: readonly number[];
  /** Entrada de feitio registrada nesta cerimônia, por lote. */
  readonly entrada?: readonly number[];
}

/** As seis últimas cerimônias — alimentam o gráfico de resultado e o de estoque. */
export const cerimoniasPassadas: readonly CerimoniaPassada[] = [
  { data: '2026-06-13', nome: 'Trabalho de cura', resultado: reais(4980.6), consumo: [6.5, 4.7, 0] },
  { data: '2026-06-27', nome: 'São João', resultado: reais(14205), consumo: [7.0, 5.2, 0] },
  { data: '2026-07-11', nome: 'Mãe Divina', resultado: reais(9870.2), consumo: [6.0, 5.0, 0] },
  {
    data: '2026-07-25',
    nome: 'Concentração',
    resultado: reais(-1240.5),
    consumo: [4.5, 3.0, 3.6],
    entrada: [0, 0, 60],
  },
  { data: '2026-08-08', nome: 'Trabalho de cura', resultado: reais(6310), consumo: [4.0, 2.4, 4.8] },
  { data: '2026-08-22', nome: 'Mãe Divina', resultado: reais(11527.7), consumo: [0, 5.0, 6.2] },
];
