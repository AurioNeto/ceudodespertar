import { reais } from '@cdd/contracts';
import { contas } from '@/pages/mocks/contas';

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
