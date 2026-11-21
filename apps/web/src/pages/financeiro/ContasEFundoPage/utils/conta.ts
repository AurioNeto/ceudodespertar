import type { ContaComSaldo as Conta, DataLocal } from '@cdd/contracts';
import type { BadgeTone, IconName } from '@/ds';
import { formatarDiaMes } from '@/pages/utils/formato';

export const ehCaixa = (c: Conta) => c.tipo === 'DINHEIRO';

export const iconeDaConta = (c: Conta): IconName =>
  ehCaixa(c) ? 'wallet' : c.titularidade === 'PESSOAL_DE_TERCEIRO' ? 'credit-card' : 'landmark';

export const textoDaConciliacao = (c: Conta, ultimaConciliacao: DataLocal | null): string => {
  if (c.conciliacao === 'CONCILIADA') {
    return ultimaConciliacao ? `Conciliada em ${formatarDiaMes(ultimaConciliacao)}` : 'Conciliada';
  }
  if (c.ultimoMovimento === null) return 'Nova conta';
  return ehCaixa(c) ? 'Contagem pendente' : 'A conferir';
};

export const tomDaConciliacao = (c: Conta): BadgeTone => (c.conciliacao === 'CONCILIADA' ? 'confirmed' : 'pending');

export const conciliacaoMaisRecente = (datas: readonly (DataLocal | null)[]): DataLocal | null =>
  datas.filter((data): data is DataLocal => data !== null).toSorted().at(-1) ?? null;

export const textoDaUltimaConciliacao = (ultimaConciliacao: DataLocal | null): string =>
  ultimaConciliacao ? `última conciliação em ${formatarDiaMes(ultimaConciliacao)}` : 'nenhuma conta conciliada';
