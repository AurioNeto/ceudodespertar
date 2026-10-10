import type { FormaDePagamento, StatusContratacao } from '@cdd/contracts';

export const STATUS_ROTULO: Record<StatusContratacao, string> = {
  PROPOSTA: 'Proposta',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
};

export const FORMA_ROTULO: Record<FormaDePagamento, string> = {
  ANTECIPADO: 'Antecipado',
  NO_ATO: 'No ato',
  FATURADO: 'Faturado',
};

export const FORMA_EXPLICACAO: Record<FormaDePagamento, string> = {
  ANTECIPADO: 'Combinado para antes do trabalho.',
  NO_ATO: 'Recebido no dia, na hora.',
  FATURADO: 'A receber depois do trabalho, na data combinada.',
};
