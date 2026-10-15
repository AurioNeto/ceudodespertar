import { dinheiro } from '@cdd/contracts';
import type { Dinheiro, Natureza, RegimeDaUnidade, TipoCategoria } from '@cdd/contracts';

export interface UnidadeDaCasa {
  readonly codigoSistema: string;
  readonly nome: string;
  readonly regime: RegimeDaUnidade;
  readonly tetoAnual: Dinheiro | null;
}

export interface GrupoDeCustoDaCasa {
  readonly codigoSistema: string;
  readonly nome: string;
}

export interface CategoriaDaCasa {
  readonly codigoSistema: string;
  readonly nome: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  readonly regimesPermitidos: readonly RegimeDaUnidade[];
  readonly linhaRelatorio: string;
}

const TETO_MEI_EM_CENTAVOS = 8_100_000;

export const UNIDADES_DA_CASA: readonly UnidadeDaCasa[] = [
  { codigoSistema: 'CDD', nome: 'CDD', regime: 'CONTRIBUICAO', tetoAnual: null },
  { codigoSistema: 'MUNAY', nome: 'Munay', regime: 'COMERCIAL', tetoAnual: dinheiro(TETO_MEI_EM_CENTAVOS) },
  { codigoSistema: 'LOJINHA', nome: 'Lojinha', regime: 'COMERCIAL', tetoAnual: null },
  { codigoSistema: 'CHACARA', nome: 'Chácara', regime: 'CONTRIBUICAO', tetoAnual: null },
  { codigoSistema: 'DORMITORIOS', nome: 'Dormitórios', regime: 'CONTRIBUICAO', tetoAnual: null },
  { codigoSistema: 'PESSOAL', nome: 'Pessoal', regime: 'CONTRIBUICAO', tetoAnual: null },
];

export const GRUPOS_DE_CUSTO_DA_CASA: readonly GrupoDeCustoDaCasa[] = [
  { codigoSistema: 'CDD', nome: 'CDD' },
  { codigoSistema: 'LOJINHA', nome: 'Lojinha' },
  { codigoSistema: 'DORMITORIO', nome: 'Dormitório' },
  { codigoSistema: 'CHACARA', nome: 'Chácara' },
  { codigoSistema: 'COZINHA', nome: 'Cozinha' },
  { codigoSistema: 'SECRETARIA', nome: 'Secretaria' },
];

export const CATEGORIAS_DA_CASA: readonly CategoriaDaCasa[] = [
  {
    codigoSistema: 'CONTRIB_CDD',
    nome: 'Contribuição de cerimônia',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Receita de contribuição',
  },
  {
    codigoSistema: 'CACHE_RECEBIDO',
    nome: 'Cachê de contratação',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Receita da Munay',
  },
  {
    codigoSistema: 'CACHE_PAGO',
    nome: 'Cachê a músico',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Custo da Munay',
  },
  {
    codigoSistema: 'VENDA_MERCADORIA',
    nome: 'Venda de mercadoria',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Receita da Lojinha',
  },
  {
    codigoSistema: 'HOSPEDAGEM',
    nome: 'Hospedagem',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Receita de hospedagem',
  },
  {
    codigoSistema: 'ALIMENTACAO_CERIMONIA',
    nome: 'Alimentação de cerimônia',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Custo de cerimônia',
  },
  {
    codigoSistema: 'CUSTO_FEITIO',
    nome: 'Custo de feitio',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Custo de feitio',
  },
  {
    codigoSistema: 'OBRA_DORMITORIO',
    nome: 'Obra do dormitório',
    natureza: 'DESPESA',
    tipo: 'INVESTIMENTO',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Investimento em benfeitoria',
  },
  {
    codigoSistema: 'MANUTENCAO',
    nome: 'Manutenção e zeladoria',
    natureza: 'DESPESA',
    tipo: 'MANUTENCAO',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Manutenção',
  },
  {
    codigoSistema: 'COMBUSTIVEL',
    nome: 'Combustível',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Deslocamento',
  },
  {
    codigoSistema: 'CUSTO_LOJINHA',
    nome: 'Custo da lojinha',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['COMERCIAL'],
    linhaRelatorio: 'Custo da Lojinha',
  },
  {
    codigoSistema: 'PRESTADOR',
    nome: 'Prestadores de serviço',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Serviços de terceiros',
  },
  {
    codigoSistema: 'ADMINISTRATIVO',
    nome: 'Administrativo',
    natureza: 'DESPESA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO', 'COMERCIAL'],
    linhaRelatorio: 'Administrativo',
  },
  {
    codigoSistema: 'APOIO_RECORRENTE',
    nome: 'Doações e apoio',
    natureza: 'RECEITA',
    tipo: 'OPERACIONAL',
    regimesPermitidos: ['CONTRIBUICAO'],
    linhaRelatorio: 'Receita de apoio',
  },
];
