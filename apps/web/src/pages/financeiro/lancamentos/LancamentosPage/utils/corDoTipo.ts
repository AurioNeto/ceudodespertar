import type { LancamentoNaLista } from '@cdd/contracts';

export const corDoTipo = (tipo: LancamentoNaLista['tipo']): string =>
  tipo === 'ENTRADA'
    ? 'var(--color-confirmed)'
    : tipo === 'TRANSFERENCIA'
      ? 'var(--color-royal)'
      : 'var(--color-attention)';
