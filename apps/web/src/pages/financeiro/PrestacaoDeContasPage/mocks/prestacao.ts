import type { Competencia, Dinheiro } from '@cdd/contracts';
import { competencia, reais } from '@cdd/contracts';

/**
 * Prestação de contas — Doc 1 §6.
 *
 * Não há DRE público: presta-se conta por exportação sob demanda, quando
 * alguém pede. O que muda entre os dois níveis não é o volume de informação, é
 * a **exposição de pessoas**: no resumo, "empréstimo concedido a Fulano" vira
 * "empréstimos concedidos". A mesma conta, sem expor ninguém.
 */

export type NivelDeDetalhe = 'RESUMO' | 'DETALHADO';

export interface LinhaDePrestacao {
  readonly rotulo: string;
  readonly valor: Dinheiro;
  /** Presente só no nível detalhado — é o que o resumo suprime. */
  readonly nominal?: string;
}

export interface SaldoDeConta {
  readonly conta: string;
  readonly inicio: Dinheiro;
  readonly fim: Dinheiro;
}

export interface ResultadoDeCerimonia {
  readonly nome: string;
  readonly data: string;
  readonly contribuicoes: Dinheiro;
  readonly custos: Dinheiro;
}

export interface DadosDaPrestacao {
  readonly periodoRotulo: string;
  readonly receitas: readonly LinhaDePrestacao[];
  readonly despesas: readonly LinhaDePrestacao[];
  /** Não entra no resultado: empréstimo e adiantamento são patrimônio (E1, A5). */
  readonly patrimonial: readonly LinhaDePrestacao[];
  readonly saldos: readonly SaldoDeConta[];
  readonly fundo: { readonly saldo: Dinheiro; readonly aportes: Dinheiro; readonly aplicacoes: Dinheiro };
  readonly cerimonias: readonly ResultadoDeCerimonia[];
}

const AGOSTO: DadosDaPrestacao = {
  periodoRotulo: 'agosto de 2026',
  receitas: [
    { rotulo: 'Contribuição de cerimônia', valor: reais(41300) },
    { rotulo: 'Cachê de contratação', valor: reais(8500), nominal: 'Instituto Terra · cerimônia de 09/08' },
    { rotulo: 'Venda de mercadoria', valor: reais(6230) },
    { rotulo: 'Hospedagem', valor: reais(4850) },
    { rotulo: 'Doações e apoio', valor: reais(1600), nominal: 'Marta Neto · Chico Aguiar · dois anônimos' },
  ],
  despesas: [
    { rotulo: 'Custo de feitio', valor: reais(11200) },
    { rotulo: 'Alimentação de cerimônia', valor: reais(9412.3) },
    { rotulo: 'Obra do dormitório', valor: reais(8764.8) },
    { rotulo: 'Cachê a músico', valor: reais(6400), nominal: 'quatro músicos da Munay' },
    { rotulo: 'Manutenção e zeladoria', valor: reais(3845.2) },
    { rotulo: 'Custo da lojinha', valor: reais(3517.9) },
    { rotulo: 'Combustível', valor: reais(2190) },
    { rotulo: 'Prestadores de serviço', valor: reais(1500), nominal: 'Zé Ferreira · diarista · pedreiro' },
    { rotulo: 'Administrativo', valor: reais(1287.4) },
  ],
  patrimonial: [
    { rotulo: 'Devolução de empréstimo recebida', valor: reais(562.4), nominal: 'de Érico Santana, em 18/08' },
    { rotulo: 'Devolução de empréstimo paga', valor: reais(1500), nominal: 'a Marta Neto, em 10/08' },
    {
      rotulo: 'Adiantamentos a ressarcir no fim do período',
      valor: reais(1969.26),
      nominal: 'Paty Munay 1.700,86 · Lucia Prado 268,40',
    },
  ],
  saldos: [
    { conta: 'Cora PJ', inicio: reais(33480.2), fim: reais(41902.1) },
    { conta: 'Espécie', inicio: reais(2940), fim: reais(3180.4) },
    { conta: 'Nubank Paty', inicio: reais(2140.45), fim: reais(1240.55) },
    { conta: 'Itaú Munay', inicio: reais(31394.85), fim: reais(37994.85) },
  ],
  fundo: { saldo: reais(39235.4), aportes: reais(4000), aplicacoes: reais(1850) },
  cerimonias: [{ nome: 'Cerimônia de Agosto', data: '15/08/2026', contribuicoes: reais(12480), custos: reais(7310.2) }],
};

const JULHO: DadosDaPrestacao = {
  periodoRotulo: 'julho de 2026',
  receitas: [
    { rotulo: 'Contribuição de cerimônia', valor: reais(36900) },
    { rotulo: 'Venda de mercadoria', valor: reais(5480) },
    { rotulo: 'Hospedagem', valor: reais(4120) },
    { rotulo: 'Doações e apoio', valor: reais(7630), nominal: 'um doador anônimo · Marta Neto' },
  ],
  despesas: [
    { rotulo: 'Alimentação de cerimônia', valor: reais(10840.6) },
    { rotulo: 'Obra do dormitório', valor: reais(12470.4) },
    { rotulo: 'Manutenção e zeladoria', valor: reais(6320) },
    { rotulo: 'Cachê a músico', valor: reais(6400), nominal: 'quatro músicos da Munay' },
    { rotulo: 'Custo da lojinha', valor: reais(8740.9) },
    { rotulo: 'Combustível', valor: reais(4218.3) },
    { rotulo: 'Administrativo', valor: reais(2880) },
  ],
  patrimonial: [
    { rotulo: 'Empréstimo tomado', valor: reais(3000), nominal: 'de Marta Neto, em 22/06 — saldo no período' },
    { rotulo: 'Adiantamentos ressarcidos', valor: reais(612), nominal: 'Carlos Andrade, em 02/07' },
  ],
  saldos: [
    { conta: 'Cora PJ', inicio: reais(36120.4), fim: reais(33480.2) },
    { conta: 'Espécie', inicio: reais(3410.8), fim: reais(2940) },
    { conta: 'Nubank Paty', inicio: reais(980.2), fim: reais(2140.45) },
    { conta: 'Itaú Munay', inicio: reais(29760.1), fim: reais(31394.85) },
  ],
  fundo: { saldo: reais(37085.4), aportes: reais(3840), aplicacoes: reais(11200) },
  cerimonias: [{ nome: 'Cerimônia de Julho', data: '25/07/2026', contribuicoes: reais(9860), custos: reais(11420.5) }],
};

export const periodos: readonly { readonly chave: string; readonly rotulo: string; readonly dados: DadosDaPrestacao }[] = [
  { chave: '2026-08', rotulo: 'Agosto de 2026', dados: AGOSTO },
  { chave: '2026-07', rotulo: 'Julho de 2026', dados: JULHO },
];

export const unidades: readonly { readonly chave: string; readonly rotulo: string }[] = [
  { chave: 'consolidado', rotulo: 'Consolidado — todas as unidades' },
  { chave: 'CDD', rotulo: 'CDD' },
  { chave: 'MUNAY', rotulo: 'Munay' },
  { chave: 'LOJINHA', rotulo: 'Lojinha' },
];

export const soma = (linhas: readonly LinhaDePrestacao[]): number => linhas.reduce((s, l) => s + l.valor, 0);

export interface PrestacaoGerada {
  readonly id: string;
  readonly periodo: Competencia;
  readonly periodoRotulo: string;
  readonly unidade: string;
  readonly nivel: NivelDeDetalhe;
  readonly geradaPor: string;
  readonly geradaEm: string;
  readonly formato: 'PDF' | 'Planilha';
  readonly hash: string;
}

/** Toda prestação gerada fica registrada — é o que permite conferir duas entre si. */
export const historico: readonly PrestacaoGerada[] = [
  {
    id: 'p-3',
    periodo: competencia('2026-07'),
    periodoRotulo: 'Julho de 2026',
    unidade: 'Consolidado',
    nivel: 'RESUMO',
    geradaPor: 'Marta Neto',
    geradaEm: '12/08/2026, 19:40',
    formato: 'PDF',
    hash: 'a41f9c72e8b0d365',
  },
  {
    id: 'p-2',
    periodo: competencia('2026-07'),
    periodoRotulo: 'Julho de 2026',
    unidade: 'Consolidado',
    nivel: 'DETALHADO',
    geradaPor: 'Aurio Neto',
    geradaEm: '10/08/2026, 09:12',
    formato: 'Planilha',
    hash: '7d2e05ba91c4f8a3',
  },
  {
    id: 'p-1',
    periodo: competencia('2026-06'),
    periodoRotulo: 'Junho de 2026',
    unidade: 'Munay',
    nivel: 'RESUMO',
    geradaPor: 'Marta Neto',
    geradaEm: '08/07/2026, 21:05',
    formato: 'PDF',
    hash: 'c93b64f107ae2d58',
  },
];

/** Hash de mentira, com a cara do de verdade: o real é do conjunto de lançamentos. */
export const gerarHash = (): string =>
  Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
