/** Agenda de trabalhos — Doc 2 §2. */

export type TipoDeTrabalho = 'Concentração' | 'Trabalho de cura' | 'Feitio' | 'Bailado' | 'Reunião do corpo';
export type SituacaoDoTrabalho = 'planejada' | 'confirmada' | 'realizada' | 'cancelada';

/** Cor por tipo de trabalho — a mesma no chip do calendário e na legenda. */
export const CORES_POR_TIPO: Record<TipoDeTrabalho, string> = {
  Concentração: 'oklch(0.52 0.13 265)',
  'Trabalho de cura': 'oklch(0.64 0.12 155)',
  Feitio: 'oklch(0.72 0.13 90)',
  Bailado: 'oklch(0.58 0.15 25)',
  'Reunião do corpo': 'oklch(0.62 0.11 205)',
};

export interface TarefaDePreparo {
  titulo: string;
  responsavel: string;
}

export interface Trabalho {
  id: number;
  nome: string;
  tipo: TipoDeTrabalho;
  ano: number;
  mes: number;
  dia: number;
  horario: string;
  local: string;
  dirigente: string;
  previstos: number;
  confirmados: number;
  visitantes: number;
  litros: number;
  /** Opções de contribuição sugerida — quem se inscreve escolhe uma. */
  contribuicoes: readonly number[];
  situacao: SituacaoDoTrabalho;
  equipe: readonly (readonly [string, string])[];
  preparo: readonly TarefaDePreparo[];
  previstoGasto: number;
  realizadoGasto: number;
  arrecadado: number;
  observacoes: string;
}

export const trabalhosIniciais: readonly Trabalho[] = [
  {
    id: 1,
    nome: 'Mãe Divina',
    tipo: 'Concentração',
    ano: 2026,
    mes: 9,
    dia: 5,
    horario: '20:00 às 04:00',
    local: 'Salão principal',
    dirigente: 'Aurio Neto',
    previstos: 84,
    confirmados: 61,
    visitantes: 12,
    litros: 9,
    contribuicoes: [40, 60, 90],
    situacao: 'confirmada',
    equipe: [
      ['Dirigente', 'Aurio Neto'],
      ['Fiscal do salão', 'Lucia Prado'],
      ['Cantoria', 'Paty Munay'],
      ['Cozinha', 'Dona Rosa'],
      ['Portaria', 'Chico Aguiar'],
    ],
    preparo: [
      { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
      { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
      { titulo: 'Separar litros do lote 12/2025', responsavel: 'Lucia Prado' },
      { titulo: 'Confirmar visitantes', responsavel: 'Paty Munay' },
      { titulo: 'Combustível da van', responsavel: 'Chico Aguiar' },
    ],
    previstoGasto: 1400,
    realizadoGasto: 187.4,
    arrecadado: 0,
    observacoes:
      'Trabalho aberto a visitantes com convite. Chegada até 19h30, portão fecha às 19h50. Quem vier de fora dorme no dormitório novo — 12 vagas.',
  },
  {
    id: 2,
    nome: 'Reunião do corpo instrutivo',
    tipo: 'Reunião do corpo',
    ano: 2026,
    mes: 9,
    dia: 12,
    horario: '19:00 às 21:00',
    local: 'Secretaria',
    dirigente: 'Lucia Prado',
    previstos: 22,
    confirmados: 18,
    visitantes: 0,
    litros: 0,
    contribuicoes: [],
    situacao: 'planejada',
    equipe: [
      ['Coordenação', 'Lucia Prado'],
      ['Secretaria', 'Paty Munay'],
    ],
    preparo: [
      { titulo: 'Pauta enviada ao corpo', responsavel: 'Lucia Prado' },
      { titulo: 'Café e lanche', responsavel: 'Dona Rosa' },
    ],
    previstoGasto: 120,
    realizadoGasto: 0,
    arrecadado: 0,
    observacoes: 'Pauta: escala do feitio de dezembro e prestação de contas de agosto.',
  },
  {
    id: 3,
    nome: 'Trabalho de cura',
    tipo: 'Trabalho de cura',
    ano: 2026,
    mes: 9,
    dia: 19,
    horario: '20:00 às 02:00',
    local: 'Salão principal',
    dirigente: 'Aurio Neto',
    previstos: 60,
    confirmados: 34,
    visitantes: 5,
    litros: 6,
    contribuicoes: [30, 50, 80],
    situacao: 'planejada',
    equipe: [
      ['Dirigente', 'Aurio Neto'],
      ['Fiscal do salão', 'Chico Aguiar'],
      ['Cantoria', 'Paty Munay'],
      ['Cozinha', 'Dona Rosa'],
    ],
    preparo: [
      { titulo: 'Separar litros', responsavel: 'Lucia Prado' },
      { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
      { titulo: 'Lista de atendimento', responsavel: 'Lucia Prado' },
    ],
    previstoGasto: 900,
    realizadoGasto: 0,
    arrecadado: 0,
    observacoes: 'Atendimento individual antes do trabalho, das 17h às 19h.',
  },
  {
    id: 4,
    nome: 'Bailado de São Miguel',
    tipo: 'Bailado',
    ano: 2026,
    mes: 9,
    dia: 27,
    horario: '19:00 às 05:00',
    local: 'Salão principal',
    dirigente: 'Aurio Neto',
    previstos: 120,
    confirmados: 45,
    visitantes: 30,
    litros: 14,
    contribuicoes: [50, 80, 120],
    situacao: 'planejada',
    equipe: [
      ['Dirigente', 'Aurio Neto'],
      ['Fiscal do salão', 'Lucia Prado'],
      ['Cantoria', 'Paty Munay'],
      ['Cozinha', 'Dona Rosa'],
      ['Portaria', 'Chico Aguiar'],
      ['Dormitório', 'Frei Tobias'],
    ],
    preparo: [
      { titulo: 'Montar tapete do salão', responsavel: 'Chico Aguiar' },
      { titulo: 'Escala de cozinha', responsavel: 'Dona Rosa' },
      { titulo: 'Reservar dormitório', responsavel: 'Frei Tobias' },
      { titulo: 'Farda e ensaio de hinário', responsavel: 'Paty Munay' },
    ],
    previstoGasto: 3200,
    realizadoGasto: 0,
    arrecadado: 0,
    observacoes: 'Maior trabalho do trimestre. Hospedagem para 30 visitantes; abrir inscrição até 20/09.',
  },
  {
    id: 5,
    nome: 'Feitio de dezembro — preparação',
    tipo: 'Feitio',
    ano: 2026,
    mes: 10,
    dia: 3,
    horario: '07:00 às 18:00',
    local: 'Casa de feitio',
    dirigente: 'Chico Aguiar',
    previstos: 25,
    confirmados: 20,
    visitantes: 0,
    litros: 0,
    contribuicoes: [],
    situacao: 'planejada',
    equipe: [
      ['Coordenação', 'Chico Aguiar'],
      ['Cozinha', 'Dona Rosa'],
      ['Materiais', 'Lucia Prado'],
    ],
    preparo: [
      { titulo: 'Comprar garrafas e rótulos', responsavel: 'Lucia Prado' },
      { titulo: 'Cortar lenha', responsavel: 'Chico Aguiar' },
      { titulo: 'Revisar tachos', responsavel: 'Chico Aguiar' },
    ],
    previstoGasto: 2400,
    realizadoGasto: 412.6,
    arrecadado: 0,
    observacoes: 'Primeira etapa: colheita e preparo do cipó. Fundo do feitio cobre os insumos.',
  },
  {
    id: 6,
    nome: 'Mãe Divina',
    tipo: 'Concentração',
    ano: 2026,
    mes: 8,
    dia: 22,
    horario: '20:00 às 04:00',
    local: 'Salão principal',
    dirigente: 'Aurio Neto',
    previstos: 80,
    confirmados: 76,
    visitantes: 9,
    litros: 8,
    contribuicoes: [40, 60, 90],
    situacao: 'realizada',
    equipe: [
      ['Dirigente', 'Aurio Neto'],
      ['Fiscal do salão', 'Lucia Prado'],
      ['Cantoria', 'Paty Munay'],
      ['Cozinha', 'Dona Rosa'],
    ],
    preparo: [
      { titulo: 'Limpeza do salão', responsavel: 'Chico Aguiar' },
      { titulo: 'Compra de mantimentos', responsavel: 'Dona Rosa' },
    ],
    previstoGasto: 1300,
    realizadoGasto: 1288.4,
    arrecadado: 940,
    observacoes: 'Trabalho realizado sem intercorrências. Contribuições lançadas em 24/08.',
  },
];

const PRIMEIROS = [
  'Ana Beatriz', 'Carlos', 'Rosa', 'Eduardo', 'Marina', 'Joana', 'Sérgio', 'Helena', 'Tobias', 'Francisco',
  'Patrícia', 'Lúcia', 'Rafael', 'Bruna', 'Otávio', 'Teresa', 'Marcos', 'Cecília', 'Fernando', 'Iara',
  'Gilberto', 'Sofia', 'Pedro', 'Clara',
];

const SOBRENOMES = [
  'Cordeiro', 'Menezes', 'Silveira', 'Pires', 'Tavares', 'Prado', 'Bittencourt', 'Duarte', 'Aguiar', 'Munay',
  'Antunes', 'Camargo', 'Lins', 'Vasques', 'Ferrari', 'Rangel', 'Monteiro', 'Sales', 'Almeida', 'Vilanova',
];

const ATENCOES_FIXAS: Record<string, string> = {
  'Ana Beatriz Cordeiro': 'uso contínuo de sertralina',
  'Carlos Menezes': 'pressão alta controlada',
  'Helena Duarte': 'gestante — 5º mês',
  'Sérgio Bittencourt': 'cirurgia cardíaca em 2023',
  'Otávio Lins': 'diabetes tipo 2',
  'Eduardo Pires': 'histórico de crise de ansiedade',
};

const ATENCOES_GERAIS = [
  'uso de medicação contínua',
  'pressão alta controlada',
  'enxaqueca crônica',
  'histórico de crise de ansiedade',
  'uso de anticoagulante',
  'diabetes tipo 2',
];

export type EstadoDaAnamnese = 'em dia' | 'vencida' | 'ausente';

export interface ParticipanteDoTrabalho {
  nome: string;
  contato: string;
  vinculo: 'Fardado' | 'Visitante';
  situacao: 'confirmado' | 'espera';
  contribuicao: number;
  anamnese: EstadoDaAnamnese;
  respondida: string;
  atencao: string | null;
}

const hashDoNome = (nome: string): number => {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 100000;
  return h;
};

/** A lista de inscritos é derivada do trabalho, para a fixture ficar coerente. */
export function participantesDe(ev: Trabalho): readonly ParticipanteDoTrabalho[] {
  const opcoes = ev.contribuicoes;
  const confirmados = Math.max(0, ev.confirmados);
  const espera = confirmados >= 30 ? 4 : confirmados >= 10 ? 2 : 0;
  const total = confirmados + espera;

  const usados = new Set<string>();
  const condicoesUsadas = new Set<string>();
  const lista: ParticipanteDoTrabalho[] = [];

  for (let i = 0; i < total; i++) {
    let nome = `${PRIMEIROS[(i * 7 + ev.id * 3) % PRIMEIROS.length]} ${SOBRENOMES[(i * 5 + ev.id) % SOBRENOMES.length]}`;
    let tentativa = 0;
    while (usados.has(nome) && tentativa < 40) {
      tentativa++;
      nome = `${PRIMEIROS[(i * 7 + ev.id * 3 + tentativa) % PRIMEIROS.length]} ${SOBRENOMES[(i * 5 + ev.id + tentativa * 3) % SOBRENOMES.length]}`;
    }
    usados.add(nome);

    const h = hashDoNome(nome);
    const visitante = i < ev.visitantes;
    const anamnese: EstadoDaAnamnese = h % 11 === 0 ? 'ausente' : h % 7 === 0 ? 'vencida' : 'em dia';

    let atencao = ATENCOES_FIXAS[nome] ?? (h % 9 === 0 ? (ATENCOES_GERAIS[h % ATENCOES_GERAIS.length] ?? null) : null);
    if (atencao && condicoesUsadas.has(atencao)) atencao = null;
    if (atencao) condicoesUsadas.add(atencao);

    lista.push({
      nome,
      contato: visitante
        ? `visitante · convidado por ${PRIMEIROS[(i + ev.id) % PRIMEIROS.length]} ${SOBRENOMES[(i + ev.id) % SOBRENOMES.length]}`
        : `fardado desde ${2008 + (h % 16)}`,
      vinculo: visitante ? 'Visitante' : 'Fardado',
      situacao: i < confirmados ? 'confirmado' : 'espera',
      contribuicao: opcoes.length ? (opcoes[h % opcoes.length] ?? 0) : 0,
      anamnese,
      respondida:
        anamnese === 'em dia'
          ? `respondida em ${String(1 + (h % 28)).padStart(2, '0')}/08/2026`
          : anamnese === 'vencida'
            ? 'respondida em 2024'
            : 'nunca respondeu',
      atencao: anamnese === 'ausente' ? null : atencao,
    });
  }

  return lista;
}

export const VERSAO_DO_FORMULARIO = 3;
