/**
 * Base de lançamentos de 2025 inteiro + 2026 até agosto, gerada por um
 * gerador determinístico: filtros e períodos mexem em números de verdade,
 * e a mesma semente devolve sempre os mesmos valores.
 */

export const GRUPOS = ['Lojinha', 'Dormitório', 'Chácara (Infraestrutura)', 'CDD', 'Cozinha', 'Secretaria'] as const;
export const CATEGORIAS_DE_SAIDA = [
  'Alimentação de cerimônia',
  'Manutenção',
  'Transporte',
  'Animais',
  'Insumos de feitio',
  'Administrativo',
] as const;
export const CATEGORIAS_DE_ENTRADA = ['Contribuições', 'Doações', 'Vendas'] as const;
export const CONTAS = ['Cora PJ', 'Espécie', 'Nubank Paty', 'Itaú Munay'] as const;
export const CERIMONIAS = [
  'Mãe Divina · setembro',
  'Mãe Divina · agosto',
  'São Miguel · julho',
  'São João · junho',
  'Sem cerimônia',
] as const;

export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Paleta categórica: uma cor por item, a mesma na barra, na fatia e na legenda. */
export const PALETA = [
  'oklch(0.52 0.13 265)',
  'oklch(0.62 0.11 205)',
  'oklch(0.64 0.12 155)',
  'oklch(0.72 0.13 110)',
  'oklch(0.76 0.13 78)',
  'oklch(0.66 0.14 48)',
  'oklch(0.58 0.15 25)',
  'oklch(0.55 0.12 330)',
  'oklch(0.46 0.10 290)',
];

const DESCRICOES: Record<string, readonly string[]> = {
  'Alimentação de cerimônia': ['mercado da cerimônia', 'feira e hortifruti', 'padaria e café'],
  Manutenção: ['reparo da bomba d’água', 'material de obra', 'reforma do telhado'],
  Transporte: ['gasolina da caminhonete', 'frete de mantimentos', 'pedágio e diesel'],
  Animais: ['ração dos cavalos', 'vermífugo e vacina', 'veterinário'],
  'Insumos de feitio': ['garrafas e rótulos', 'lenha para o feitio', 'cipó e folha'],
  Administrativo: ['conta de luz', 'internet da secretaria', 'diarista'],
  Contribuições: ['contribuições da cerimônia', 'mensalidade do corpo'],
  Doações: ['doação de padrinho', 'doação avulsa'],
  Vendas: ['venda de camisetas', 'venda de livros', 'venda de velas'],
};

export type TipoNoRelatorio = 'saida' | 'entrada' | 'transferencia';
export type SituacaoNoRelatorio = 'consolidado' | 'a conferir';

export interface LinhaDoRelatorio {
  readonly id: number;
  readonly ano: number;
  readonly mes: number;
  readonly data: string;
  readonly tipo: TipoNoRelatorio;
  /** Em reais — esta base é de leitura, não passa por agregado. */
  readonly valor: number;
  readonly grupo: string | null;
  readonly categoria: string | null;
  readonly conta: string;
  readonly cerimonia: string;
  readonly unidade: 'CDD' | 'Munay';
  readonly situacao: SituacaoNoRelatorio;
  readonly motivo: string;
}

function gerar(): readonly LinhaDoRelatorio[] {
  let semente = 20260901;
  const rnd = () => {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    return semente / 2147483648;
  };
  const escolher = <T,>(lista: readonly T[]): T => lista[Math.floor(rnd() * lista.length)] as T;

  const linhas: LinhaDoRelatorio[] = [];
  let id = 1;

  for (const { ano, ate } of [
    { ano: 2025, ate: 12 },
    { ano: 2026, ate: 8 },
  ]) {
    for (let mes = 1; mes <= ate; mes++) {
      for (let i = 0; i < 7; i++) {
        const tipo: TipoNoRelatorio = i < 4 ? 'saida' : i < 6 ? 'entrada' : 'transferencia';
        const categoria =
          tipo === 'saida' ? escolher(CATEGORIAS_DE_SAIDA) : tipo === 'entrada' ? escolher(CATEGORIAS_DE_ENTRADA) : null;
        const base = tipo === 'saida' ? 60 + rnd() * 1700 : tipo === 'entrada' ? 200 + rnd() * 2900 : 500 + rnd() * 1500;
        const fator = ano === 2025 ? 0.82 : 1;
        const descricoes = categoria ? (DESCRICOES[categoria] ?? ['lançamento']) : ['repasse entre contas'];

        linhas.push({
          id: id++,
          ano,
          mes,
          data: `${String(2 + Math.floor(rnd() * 26)).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`,
          tipo,
          valor: Math.round(base * fator * 100) / 100,
          grupo: tipo === 'transferencia' ? null : escolher(GRUPOS),
          categoria,
          conta: escolher(CONTAS),
          cerimonia: tipo === 'transferencia' ? 'Sem cerimônia' : escolher(CERIMONIAS),
          unidade: rnd() < 0.78 ? 'CDD' : 'Munay',
          situacao: rnd() < 0.12 ? 'a conferir' : 'consolidado',
          motivo: escolher(descricoes),
        });
      }
    }
  }

  return linhas;
}

export const baseDoRelatorio = gerar();

/** Fundo próprio contra as metas combinadas. */
export const metasDeFundo = [
  {
    nome: 'Obra do dormitório',
    valor: 18400,
    meta: 24000,
    cor: 'var(--color-royal)',
    nota: 'previsão de conclusão em novembro',
  },
  {
    nome: 'Feitio de dezembro',
    valor: 9200,
    meta: 12000,
    cor: 'var(--color-confirmed)',
    nota: 'insumos, garrafas e deslocamento',
  },
  {
    nome: 'Emergência e saúde',
    valor: 6000,
    meta: 6000,
    cor: 'var(--color-pending)',
    nota: 'meta atingida, mantida intocada',
  },
] as const;
