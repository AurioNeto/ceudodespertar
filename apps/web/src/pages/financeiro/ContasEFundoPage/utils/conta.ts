import type { Conta } from '@cdd/contracts';

export const ehCaixa = (c: Conta) => c.tipo === 'DINHEIRO';
