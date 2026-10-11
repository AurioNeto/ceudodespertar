import { contas } from '@/pages/mocks/contas';
import { CONTA_PADRAO_DO_RECEBIMENTO } from '../constantes';

export function contaPadraoDoRecebimento(): string {
  const ativas = contas.filter((c) => c.ativa);
  const padrao = ativas.find((c) => (c.id as string) === CONTA_PADRAO_DO_RECEBIMENTO) ?? ativas[0];
  return padrao ? (padrao.id as string) : '';
}
