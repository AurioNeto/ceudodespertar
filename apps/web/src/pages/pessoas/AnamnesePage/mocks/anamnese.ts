export type SituacaoDaVersao = 'rascunho' | 'publicada' | 'arquivada';

export interface PerguntaDoFormulario {
  titulo: string;
  tipo: string;
  obrigatoria: boolean;
  /** Regra que transforma a resposta em ponto de atenção (Doc 2 §4). */
  alerta: string | null;
}

export interface VersaoDoFormulario {
  id: string;
  rotulo: string;
  situacao: SituacaoDaVersao;
  criadaEm: string;
  criadaPor: string;
  publicadaEm: string | null;
  respostas: number;
  descricao: string;
  perguntas: readonly PerguntaDoFormulario[];
  historico: readonly (readonly [string, string])[];
}

const pergunta = (
  titulo: string,
  tipo: string,
  obrigatoria: boolean,
  alerta: string | null,
): PerguntaDoFormulario => ({ titulo, tipo, obrigatoria, alerta });

const PERGUNTAS_V3: readonly PerguntaDoFormulario[] = [
  pergunta('Você faz uso de medicação contínua?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Quais medicações e doses?', 'Texto longo', false, 'qualquer resposta com antidepressivo'),
  pergunta('Tem ou teve diagnóstico psiquiátrico?', 'Escolha única', true, 'resposta diferente de não'),
  pergunta('Tem alguma condição cardíaca, hipertensão ou diabetes?', 'Múltipla escolha', true, 'qualquer marcação'),
  pergunta('Está gestante ou amamentando?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Fez uso de álcool ou outras substâncias nos últimos 3 dias?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Já participou de trabalho com ayahuasca antes?', 'Sim ou não', true, null),
  pergunta('Contato de emergência (nome e telefone)', 'Texto curto', true, null),
  pergunta('Alguma coisa que a casa precise saber e não foi perguntada?', 'Texto longo', false, null),
];

const PERGUNTAS_V2: readonly PerguntaDoFormulario[] = [
  pergunta('Faz uso de medicação contínua?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Tem diagnóstico psiquiátrico?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Tem condição cardíaca?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Está gestante?', 'Sim ou não', true, 'resposta sim'),
  pergunta('Contato de emergência', 'Texto curto', true, null),
];

const PERGUNTAS_V1: readonly PerguntaDoFormulario[] = [
  pergunta('Toma algum remédio?', 'Texto curto', false, null),
  pergunta('Tem algum problema de saúde?', 'Texto longo', false, null),
  pergunta('Contato de emergência', 'Texto curto', true, null),
];

export const TIPOS_DE_PERGUNTA = [
  'Sim ou não',
  'Texto curto',
  'Texto longo',
  'Escolha única',
  'Múltipla escolha',
  'Data',
  'Número',
];

export const versoesIniciais: readonly VersaoDoFormulario[] = [
  {
    id: 'v4',
    rotulo: 'Anamnese do corpo · v4',
    situacao: 'rascunho',
    criadaEm: '28/08/2026',
    criadaPor: 'Lucia Prado',
    publicadaEm: null,
    respostas: 0,
    descricao: 'Rascunho aberto a partir da v3. Enquanto não for publicada, ninguém recebe este formulário.',
    perguntas: [...PERGUNTAS_V3, pergunta('Faz acompanhamento terapêutico hoje?', 'Sim ou não', false, null)],
    historico: [
      ['28/08/2026', 'Rascunho criado por Lucia Prado a partir da v3.'],
      ['29/08/2026', 'Pergunta sobre acompanhamento terapêutico adicionada.'],
    ],
  },
  {
    id: 'v3',
    rotulo: 'Anamnese do corpo · v3',
    situacao: 'publicada',
    criadaEm: '02/06/2026',
    criadaPor: 'Lucia Prado',
    publicadaEm: '12/06/2026',
    respostas: 128,
    descricao: 'Versão em uso. Todo link enviado hoje abre esta versão, e as respostas ficam presas a ela.',
    perguntas: PERGUNTAS_V3,
    historico: [
      ['02/06/2026', 'Rascunho criado a partir da v2.'],
      ['10/06/2026', 'Revisada pela direção.'],
      ['12/06/2026', 'Publicada por Aurio Neto. v2 passou a arquivada.'],
    ],
  },
  {
    id: 'v2',
    rotulo: 'Anamnese do corpo · v2',
    situacao: 'arquivada',
    criadaEm: '15/01/2024',
    criadaPor: 'Aurio Neto',
    publicadaEm: '01/02/2024',
    respostas: 96,
    descricao: 'Arquivada. As respostas dadas nela continuam válidas até vencer, mas ninguém responde mais por aqui.',
    perguntas: PERGUNTAS_V2,
    historico: [
      ['01/02/2024', 'Publicada por Aurio Neto.'],
      ['12/06/2026', 'Arquivada pela publicação da v3.'],
    ],
  },
  {
    id: 'v1',
    rotulo: 'Anamnese do corpo · v1',
    situacao: 'arquivada',
    criadaEm: '08/2022',
    criadaPor: 'Secretaria',
    publicadaEm: '09/2022',
    respostas: 41,
    descricao: 'Primeiro formulário, três perguntas abertas. Mantido só como histórico.',
    perguntas: PERGUNTAS_V1,
    historico: [
      ['09/2022', 'Publicada pela secretaria.'],
      ['01/02/2024', 'Arquivada pela publicação da v2.'],
    ],
  },
];
