import type { Conta } from '@cdd/contracts';
import type { BadgeTone, IconName } from '@/ds';

export const ehCaixa = (c: Conta) => c.tipo === 'DINHEIRO';

export const iconeDaConta = (c: Conta): IconName =>
  ehCaixa(c) ? 'wallet' : c.titularidade === 'PESSOAL_DE_TERCEIRO' ? 'credit-card' : 'landmark';

export const textoDaConciliacao = (c: Conta): string => {
  if (c.conciliacao === 'CONCILIADA') return 'Conciliada ontem';
  if (c.ultimoMovimento === null) return 'Nova conta';
  return ehCaixa(c) ? 'Contagem pendente' : 'A conferir';
};

export const tomDaConciliacao = (c: Conta): BadgeTone => (c.conciliacao === 'CONCILIADA' ? 'confirmed' : 'pending');
