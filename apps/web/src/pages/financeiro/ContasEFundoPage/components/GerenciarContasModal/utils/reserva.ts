import type { Dinheiro, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { lerValorDigitado } from '@/lib/numero';
import { formatarDinheiro } from '@/pages/utils/formato';
import { MENSAGEM_DE_RESERVA_ZERADA } from '../constantes';

export type ReservaLida = { valida: true; valor: Dinheiro } | { valida: false; erro: string };

export const disponivelParaReserva = (fundos: readonly Fundo[], fundoProprio: number, fundoId: FundoId): number =>
  fundos
    .filter((f) => f.ativo && f.id !== fundoId)
    .reduce((disponivel, f) => disponivel - f.valorReservado, fundoProprio);

export function lerReserva(digitado: string, disponivel: number): ReservaLida {
  const lido = lerValorDigitado(digitado);
  const valor = reais(lido);
  if (Number.isNaN(lido) || valor <= 0) return { valida: false, erro: MENSAGEM_DE_RESERVA_ZERADA };
  if (valor > disponivel) {
    return { valida: false, erro: `Passa do que está livre no fundo próprio: ${formatarDinheiro(disponivel)}.` };
  }
  return { valida: true, valor };
}
