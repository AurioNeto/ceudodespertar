import type { LancamentoNaLista } from '@cdd/contracts';

export const rotuloDoTipo = (tipo: LancamentoNaLista['tipo']): string =>
  tipo === 'ENTRADA' ? 'Entrada' : tipo === 'TRANSFERENCIA' ? 'Transferência' : 'Saída';

export const rotuloDaSituacao = (status: LancamentoNaLista['status']): string =>
  status === 'A_CONFERIR' ? 'A conferir' : status === 'ESTORNADO' ? 'Estornado' : 'Consolidado';
