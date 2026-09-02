import type { Conta, ContaId, Fundo, FundoId, PessoaId } from '@cdd/contracts';
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
    descricao: 'conta principal da casa · CNPJ do CDD',
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
    descricao: 'caixa da chácara · cofre da secretaria',
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
    descricao: 'conta pessoal usada em nome da casa',
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
    descricao: 'unidade comercial · lojinha',
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
    nota: 'meta 24.000,00 · previsão de conclusão em novembro',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(18400),
    meta: reais(24000),
    ativo: true,
  },
  {
    id: id<FundoId>('feitio'),
    codigoSistema: 'FUNDO_FEITIO',
    nome: 'Feitio de dezembro',
    nota: 'insumos, garrafas e deslocamento',
    contaVinculadaId: id<ContaId>('cora'),
    valorReservado: reais(9200),
    meta: null,
    ativo: true,
  },
  {
    id: id<FundoId>('emergencia'),
    codigoSistema: 'FUNDO_EMERGENCIA',
    nome: 'Emergência e saúde',
    nota: 'intocável fora de emergência, decisão da direção',
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

export const remessasEmLote = 3;
