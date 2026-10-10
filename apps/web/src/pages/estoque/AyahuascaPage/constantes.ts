import type { TipoDeMovimento } from './mocks/ayahuasca';

export const rotuloDoMovimento: Record<TipoDeMovimento, string> = {
  entrada: 'Entrada',
  saida: 'Saída para trabalho',
  transferencia: 'Transferência',
  perda: 'Perda',
};
