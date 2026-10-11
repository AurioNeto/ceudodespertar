import type { Emprestimo } from '@cdd/contracts';

export const devolvido = (e: Emprestimo): number => e.devolucoes.reduce((soma, d) => soma + d.valor, 0);

/** E2: a soma das devoluções nunca excede o principal, então o saldo nunca é negativo. */
export const saldoDevedor = (e: Emprestimo): number => e.valorPrincipal - devolvido(e);

export const quitado = (e: Emprestimo): boolean => saldoDevedor(e) === 0;
