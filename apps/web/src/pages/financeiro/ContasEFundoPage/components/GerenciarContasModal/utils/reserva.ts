import type { Dinheiro, FundoComSaldo as Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { lerValorDigitado } from '@/lib/numero';
import { formatarBRL } from '@/pages/utils/formato';
import { MENSAGEM_DE_RESERVA_ZERADA } from '../constantes';

const passaDoLivre = (disponivel: number): string =>
  `Passa do que está livre no fundo próprio: ${formatarBRL(disponivel)}.`;

export type ReservaLida = { valida: true; valor: Dinheiro } | { valida: false; erro: string };

export const disponivelParaReserva = (fundos: readonly Fundo[], fundoProprio: number, fundoId: FundoId): number =>
  fundos
    .filter((f) => f.ativo && f.id !== fundoId)
    .reduce((disponivel, f) => disponivel - f.valorReservado, fundoProprio);

export function lerReserva(digitado: string, disponivel: number): ReservaLida {
  const lido = lerValorDigitado(digitado);
  const valor = reais(lido);
  if (Number.isNaN(lido) || valor <= 0) return { valida: false, erro: MENSAGEM_DE_RESERVA_ZERADA };
  if (valor > disponivel) return { valida: false, erro: passaDoLivre(disponivel) };
  return { valida: true, valor };
}

export function bloqueioDeReativar(fundo: Fundo, fundos: readonly Fundo[], fundoProprio: number): string | undefined {
  if (fundo.ativo) return undefined;
  const disponivel = disponivelParaReserva(fundos, fundoProprio, fundo.id);
  return fundo.valorReservado > disponivel ? passaDoLivre(disponivel) : undefined;
}
