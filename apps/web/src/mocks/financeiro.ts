import type { Conta, ContaId, Fundo, FundoId, ItemDeVerificacao, LancamentoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id } from './ids';

/**
 * Fixtures do protótipo. Caixa 3.180,40 + banco 81.137,50 = 84.317,90, e o
 * fundo próprio (39.235,40) é parte desse saldo, não uma terceira parcela.
 */
export const contas: readonly Conta[] = [
  {
    id: id<ContaId>('cora'),
    nome: 'Cora PJ',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Aurio Neto',
    saldo: reais(41902.1),
    ultimoMovimento: dataLocal('2026-09-02'),
    conciliacao: 'CONCILIADA',
    alerta: null,
    ativa: true,
  },
  {
    id: id<ContaId>('especie'),
    nome: 'Espécie',
    tipo: 'DINHEIRO',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Chico Aguiar',
    saldo: reais(3180.4),
    ultimoMovimento: dataLocal('2026-08-19'),
    conciliacao: 'PENDENTE',
    alerta: 'Última contagem física foi em 31/07. O combinado é contar todo dia 15.',
    ativa: true,
  },
  {
    id: id<ContaId>('nubank'),
    nome: 'Nubank Paty',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'PESSOAL_DE_TERCEIRO',
    pessoaTitularId: id<PessoaId>('p-paty'),
    responsavel: 'Paty Munay',
    saldo: reais(1240.55),
    ultimoMovimento: dataLocal('2026-08-23'),
    conciliacao: 'PENDENTE',
    alerta: 'Conta pessoal: o combinado é zerar para o Cora até o fim de cada mês.',
    ativa: true,
  },
  {
    id: id<ContaId>('itau'),
    nome: 'Itaú Munay',
    tipo: 'CONTA_CORRENTE',
    titularidade: 'INSTITUCIONAL',
    pessoaTitularId: null,
    responsavel: 'Paty Munay',
    saldo: reais(37994.85),
    ultimoMovimento: dataLocal('2026-08-22'),
    conciliacao: 'CONCILIADA',
    alerta: null,
    ativa: true,
  },
];

/** O fundo próprio é destinação vinculada dentro do saldo, não conta separada. */
export const fundoProprio = reais(39235.4);

export const fundos: readonly Fundo[] = [
  {
    id: id<FundoId>('obra'),
    codigoSistema: 'FUNDO_OBRA',
    nome: 'Obra do dormitório',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(18400),
    meta: reais(24000),
    ativo: true,
  },
  {
    id: id<FundoId>('feitio'),
    codigoSistema: 'FUNDO_FEITIO',
    nome: 'Feitio de dezembro',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(9200),
    meta: null,
    ativo: true,
  },
  {
    id: id<FundoId>('emergencia'),
    codigoSistema: 'FUNDO_EMERGENCIA',
    nome: 'Emergência e saúde',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(6000),
    meta: null,
    ativo: true,
  },
];

export const saldoEmCaixa = contas
  .filter((c) => c.tipo === 'DINHEIRO' && c.ativa)
  .reduce((soma, c) => soma + c.saldo, 0);

export const saldoEmBanco = contas
  .filter((c) => c.tipo !== 'DINHEIRO' && c.ativa)
  .reduce((soma, c) => soma + c.saldo, 0);

export const saldoConsolidado = saldoEmCaixa + saldoEmBanco;

/** Movimento da competência, com o mês anterior para comparação. */
export const movimentoDoMes = {
  entradas: reais(62480),
  entradasAnterior: reais(54130),
  saidas: reais(48117.6),
  saidasAnterior: reais(51870.2),
  resultado: reais(14362.4),
  resultadoAnterior: reais(2259.8),
} as const;

/**
 * A única coisa que pede verificação humana é a remessa lida pela IA —
 * lançamento manual entra consolidado. 12 itens em 3 remessas.
 */
export const filaDeVerificacao: readonly Pick<ItemDeVerificacao, 'id' | 'origem' | 'confianca'>[] = Array.from(
  { length: 12 },
  (_, i) => ({
    id: id<LancamentoId>(`v-${i + 1}`),
    origem: i < 7 ? 'COMPROVANTE' : i < 10 ? 'EXTRATO' : 'REGISTRO_RAPIDO',
    confianca: i % 3 === 0 ? 'ALTA' : i % 3 === 1 ? 'MEDIA' : 'BAIXA',
  }),
);

export const remessasEmLote = 3;
