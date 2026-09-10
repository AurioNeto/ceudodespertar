import type { CategoriaId, Dinheiro, Natureza, RegimeDaUnidade, TipoCategoria, UnidadeId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Plano de contas, unidades e parâmetros da instituição.
 *
 * O buraco que esta tela existe para fechar: **categoria ativa sem linha de
 * relatório**. Na planilha, "Investimento na Lojinha" e "Movimentação" não
 * tinham linha no DRE, e R$ 40,6 mil ficaram órfãos sem que nada sinalizasse
 * isso como erro (Doc 2, invariante C1).
 */

export interface CategoriaDoPlano {
  readonly id: CategoriaId;
  readonly codigoSistema: string;
  readonly nome: string;
  /** C2: imutável depois de criada. Uma categoria não muda de lado. */
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  /** C3: só unidade de regime permitido usa esta categoria. */
  readonly regimesPermitidos: readonly RegimeDaUnidade[];
  /** C1: obrigatória enquanto a categoria estiver ativa. */
  readonly linhaRelatorio: string | null;
  readonly ativa: boolean;
  readonly lancamentos: number;
  readonly nota: string | null;
}

const cat = (n: string) => id<CategoriaId>(n);

export const categorias: readonly CategoriaDoPlano[] = [
  {
    id: cat('c-contrib'),
    codigoSistema: 'CONTRIB_CDD',
    nome: 'Contribuição de cerimônia',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Receita de contribuição',
    ativa: true,
    lancamentos: 214,
    nota: null,
  },
  {
    id: cat('c-cache-rec'),
    codigoSistema: 'CACHE_RECEBIDO',
    nome: 'Cachê de contratação',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Receita da Munay',
    ativa: true,
    lancamentos: 7,
    nota: 'O contratante paga a Munay. Não confundir com o cachê pago ao músico.',
  },
  {
    id: cat('c-cache-pago'),
    codigoSistema: 'CACHE_PAGO',
    nome: 'Cachê a músico',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Custo da Munay',
    ativa: true,
    lancamentos: 31,
    nota: 'Mesma palavra do cachê recebido, natureza oposta — por isso são duas categorias.',
  },
  {
    id: cat('c-venda'),
    codigoSistema: 'VENDA_MERCADORIA',
    nome: 'Venda de mercadoria',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Receita da Lojinha',
    ativa: true,
    lancamentos: 46,
    nota: null,
  },
  {
    id: cat('c-hosp'),
    codigoSistema: 'HOSPEDAGEM',
    nome: 'Hospedagem',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Receita de hospedagem',
    ativa: true,
    lancamentos: 88,
    nota: null,
  },
  {
    id: cat('c-alim'),
    codigoSistema: 'ALIMENTACAO_CERIMONIA',
    nome: 'Alimentação de cerimônia',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Custo de cerimônia',
    ativa: true,
    lancamentos: 132,
    nota: null,
  },
  {
    id: cat('c-feitio'),
    codigoSistema: 'CUSTO_FEITIO',
    nome: 'Custo de feitio',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Custo de feitio',
    ativa: true,
    lancamentos: 24,
    nota: null,
  },
  {
    id: cat('c-obra'),
    codigoSistema: 'OBRA_DORMITORIO',
    nome: 'Obra do dormitório',
    natureza: 'DESPESA',
    tipo: 'INVESTIMENTO',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Investimento em benfeitoria',
    ativa: true,
    lancamentos: 63,
    nota: null,
  },
  {
    id: cat('c-manut'),
    codigoSistema: 'MANUTENCAO',
    nome: 'Manutenção e zeladoria',
    natureza: 'DESPESA',
    tipo: 'MANUTENCAO',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Manutenção',
    ativa: true,
    lancamentos: 97,
    nota: null,
  },
  {
    id: cat('c-comb'),
    codigoSistema: 'COMBUSTIVEL',
    nome: 'Combustível',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Deslocamento',
    ativa: true,
    lancamentos: 71,
    nota: null,
  },
  {
    id: cat('c-lojinha-custo'),
    codigoSistema: 'CUSTO_LOJINHA',
    nome: 'Custo da lojinha',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Custo da Lojinha',
    ativa: true,
    lancamentos: 38,
    nota: null,
  },
  {
    id: cat('c-prestador'),
    codigoSistema: 'PRESTADOR',
    nome: 'Prestadores de serviço',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Serviços de terceiros',
    ativa: true,
    lancamentos: 42,
    nota: null,
  },
  {
    id: cat('c-admin'),
    codigoSistema: 'ADMINISTRATIVO',
    nome: 'Administrativo',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Administrativo',
    ativa: true,
    lancamentos: 55,
    nota: null,
  },
  {
    id: cat('c-apoio'),
    codigoSistema: 'APOIO_RECORRENTE',
    nome: 'Doações e apoio',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Receita de apoio',
    ativa: true,
    lancamentos: 29,
    nota: 'Enquanto não existe o agregado Apoio, a recorrência vive aqui (Doc 2 §6.1).',
  },

  // ── As duas do buraco dos R$ 40,6 mil ────────────────────────────────────
  {
    id: cat('c-inv-lojinha'),
    codigoSistema: 'INVESTIMENTO_LOJINHA',
    nome: 'Investimento na Lojinha',
    natureza: 'DESPESA',
    tipo: 'INVESTIMENTO',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: null,
    ativa: true,
    lancamentos: 18,
    nota: 'Veio da planilha sem linha no DRE. É metade do buraco dos R$ 40,6 mil.',
  },
  {
    id: cat('c-movimentacao'),
    codigoSistema: 'MOVIMENTACAO',
    nome: 'Movimentação',
    natureza: 'DESPESA',
    tipo: 'PATRIMONIAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: null,
    ativa: true,
    lancamentos: 26,
    nota: 'Na planilha, transferência entre contas entrava aqui como despesa. Vira Transferência no modelo novo (Doc 2 §1.4) — esta categoria deve ser inativada depois da migração.',
  },

  {
    id: cat('c-emprestimo'),
    codigoSistema: 'EMPRESTIMO_ANTIGO',
    nome: 'Empréstimo (antigo)',
    natureza: 'DESPESA',
    tipo: 'PATRIMONIAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Movimentação patrimonial',
    ativa: false,
    lancamentos: 9,
    nota: 'Inativada: empréstimo virou agregado próprio e não é mais despesa (E1).',
  },
];

export const LINHAS_DE_RELATORIO: readonly string[] = [
  'Receita de contribuição',
  'Receita de hospedagem',
  'Receita de apoio',
  'Receita da Lojinha',
  'Receita da Munay',
  'Custo de cerimônia',
  'Custo de feitio',
  'Custo da Lojinha',
  'Custo da Munay',
  'Manutenção',
  'Deslocamento',
  'Serviços de terceiros',
  'Administrativo',
  'Investimento em benfeitoria',
  'Movimentação patrimonial',
];

/* ── Unidades ────────────────────────────────────────────────────────────── */

export interface UnidadeDoPlano {
  readonly id: UnidadeId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly regime: RegimeDaUnidade | null;
  readonly documentoFiscal: string | null;
  readonly tetoFaturamentoAnual: Dinheiro | null;
  readonly faturamentoNoAno: Dinheiro | null;
  readonly ativa: boolean;
  readonly nota: string | null;
}

export const unidades: readonly UnidadeDoPlano[] = [
  {
    id: id<UnidadeId>('u-cdd'),
    codigoSistema: 'CDD',
    nome: 'CDD',
    regime: 'CONTRIBUICAO',
    documentoFiscal: null,
    tetoFaturamentoAnual: null,
    faturamentoNoAno: null,
    ativa: true,
    nota: 'Vocabulário de contribuição obrigatório: não se diz venda, cliente nem preço.',
  },
  {
    id: id<UnidadeId>('u-munay'),
    codigoSistema: 'MUNAY',
    nome: 'Munay',
    regime: 'COMERCIAL',
    documentoFiscal: '41.882.310/0001-55',
    tetoFaturamentoAnual: reais(81000),
    faturamentoNoAno: reais(43700),
    ativa: true,
    nota: 'MEI próprio. Shows, royalties, estúdio e cerimônias contratadas.',
  },
  {
    id: id<UnidadeId>('u-lojinha'),
    codigoSistema: 'LOJINHA',
    nome: 'Lojinha',
    regime: 'COMERCIAL',
    documentoFiscal: null,
    tetoFaturamentoAnual: null,
    faturamentoNoAno: reais(28460),
    ativa: true,
    nota: 'Vende mercadoria. Sem CNPJ próprio por enquanto.',
  },
  {
    id: id<UnidadeId>('u-chacara'),
    codigoSistema: 'CHACARA',
    nome: 'Chácara',
    regime: null,
    documentoFiscal: null,
    tetoFaturamentoAnual: null,
    faturamentoNoAno: null,
    ativa: true,
    nota: 'Regime a confirmar: comercial se houver cessão ou locação fora de trabalho.',
  },
  {
    id: id<UnidadeId>('u-dorm'),
    codigoSistema: 'DORMITORIOS',
    nome: 'Dormitórios',
    regime: null,
    documentoFiscal: null,
    tetoFaturamentoAnual: null,
    faturamentoNoAno: null,
    ativa: true,
    nota: 'Regime a confirmar: o beliche dentro da cerimônia é adicional de contribuição; hospedagem avulsa seria comercial.',
  },
  {
    id: id<UnidadeId>('u-pessoal'),
    codigoSistema: 'PESSOAL',
    nome: 'Pessoal',
    regime: 'CONTRIBUICAO',
    documentoFiscal: null,
    tetoFaturamentoAnual: null,
    faturamentoNoAno: null,
    ativa: true,
    nota: 'Unidade técnica, sem receita própria.',
  },
];

/* ── Parâmetros da instituição ───────────────────────────────────────────── */

export interface ParametroDaCasa {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: string;
  readonly nota: string;
  readonly editavel: boolean;
}

export const parametrosDaCasa: readonly ParametroDaCasa[] = [
  {
    chave: 'instituicao',
    rotulo: 'Instituição',
    valor: 'Céu do Despertar',
    nota: 'O tenant. Fronteira de isolamento de dados.',
    editavel: true,
  },
  {
    chave: 'fuso',
    rotulo: 'Fuso horário',
    valor: 'America/Sao_Paulo',
    nota: 'Datas de competência e caixa seguem este fuso.',
    editavel: false,
  },
  {
    chave: 'moeda',
    rotulo: 'Moeda',
    valor: 'BRL · real',
    nota: 'Valores em centavos inteiros, nunca em ponto flutuante.',
    editavel: false,
  },
  {
    chave: 'consumo-daime',
    rotulo: 'Consumo médio por consagrante',
    valor: '0,18 L',
    nota: 'Base da estimativa de consumo. O sistema sugere recalibragem pelo histórico, nunca altera sozinho (EC3, EC4).',
    editavel: true,
  },
  {
    chave: 'validade-anamnese',
    rotulo: 'Validade da anamnese',
    valor: '12 meses',
    nota: 'Passado o prazo, a revalidação é completa, não incremental (RA1).',
    editavel: true,
  },
  {
    chave: 'fechamento',
    rotulo: 'Dia sugerido de fechamento',
    valor: 'dia 10 do mês seguinte',
    nota: 'Sugestão, não trava: o que trava o fechamento é a fila de conferência vazia (P1).',
    editavel: true,
  },
];
