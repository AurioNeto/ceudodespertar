import type { TipoLancamento } from '@cdd/contracts';

export const ROTULO_DO_VALOR: Record<TipoLancamento, string> = {
  SAIDA: 'Quanto foi',
  ENTRADA: 'Quanto entrou',
  TRANSFERENCIA: 'Quanto transferiu',
};
