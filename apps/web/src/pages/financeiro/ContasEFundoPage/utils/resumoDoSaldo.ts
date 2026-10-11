import type { Conta, Fundo } from '@cdd/contracts';
import type { Reserva } from '../tipos';
import { ehCaixa } from './conta';
import { corDaReserva } from './reservas';

export function resumoDoSaldo(contas: readonly Conta[], fundos: readonly Fundo[], fundoProprio: number) {
  const contasAtivas = contas.filter((c) => c.ativa);
  const fundosAtivos = fundos.filter((f) => f.ativo);

  const emCaixa = contasAtivas.filter(ehCaixa).reduce((a, c) => a + c.saldo, 0);
  const emBanco = contasAtivas.filter((c) => !ehCaixa(c)).reduce((a, c) => a + c.saldo, 0);
  const comprometido = fundosAtivos.reduce((a, f) => a + f.valorReservado, 0);
  const livre = fundoProprio - comprometido;
  const pendentes = contasAtivas.filter((c) => c.conciliacao === 'PENDENTE').length;

  const reservas: Reserva[] = [
    ...fundosAtivos.map((f, i) => ({
      chave: f.id,
      nome: f.nome,
      nota: f.nota,
      valor: f.valorReservado,
      cor: corDaReserva(i),
    })),
    {
      chave: 'livre',
      nome: 'Livre',
      nota: 'sem destino combinado',
      valor: livre,
      cor: 'var(--color-line-strong)',
    },
  ];

  return { contasAtivas, emCaixa, emBanco, comprometido, livre, pendentes, reservas };
}
