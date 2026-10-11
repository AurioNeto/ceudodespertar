import type { DirecaoEmprestimo } from '@cdd/contracts';

export type Filtro = 'todos' | 'CONCEDIDO' | 'RECEBIDO' | 'quitados';

export const DIRECAO: Record<DirecaoEmprestimo, { rotulo: string; verbo: string; saldoRotulo: string }> = {
  CONCEDIDO: { rotulo: 'Concedido', verbo: 'A casa emprestou', saldoRotulo: 'A receber' },
  RECEBIDO: { rotulo: 'Recebido', verbo: 'A casa tomou', saldoRotulo: 'A devolver' },
};
