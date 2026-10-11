import type { LoteDeDaime, ReservaDeTrabalho } from '../mocks/ayahuasca';

export const saldos = (
  lotes: readonly LoteDeDaime[],
  reservas: readonly ReservaDeTrabalho[],
  reservado: Readonly<Record<number, boolean>>,
) => {
  const emEstoque = lotes.filter((l) => l.situacao !== 'quarentena').reduce((a, l) => a + l.restante, 0);
  const emQuarentena = lotes.filter((l) => l.situacao === 'quarentena').reduce((a, l) => a + l.restante, 0);
  const reservadoTotal = reservas.filter((r) => reservado[r.id]).reduce((a, r) => a + r.litros, 0);
  const livre = emEstoque - reservadoTotal;
  const previsto = reservas.reduce((a, r) => a + r.litros, 0);
  return { emEstoque, emQuarentena, reservadoTotal, livre, previsto };
};
