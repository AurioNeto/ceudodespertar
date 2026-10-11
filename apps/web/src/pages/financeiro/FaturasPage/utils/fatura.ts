import type { ContaId, Fatura } from '@cdd/contracts';

export const totalDaFatura = (f: Fatura): number => f.compras.reduce((soma, c) => soma + c.valor, 0);

/** O que a casa ainda deve neste cartão: tudo que não foi pago. */
export const dividaDoCartao = (lista: readonly Fatura[], contaId: ContaId) =>
  lista.filter((f) => f.contaId === contaId && f.status !== 'PAGA').reduce((soma, f) => soma + totalDaFatura(f), 0);
