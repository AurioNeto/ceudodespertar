const CORES_DE_RESERVA = [
  'var(--color-royal)',
  'var(--color-confirmed)',
  'var(--color-pending)',
  'var(--color-attention)',
];

export const corDaReserva = (indice: number) => CORES_DE_RESERVA[indice % CORES_DE_RESERVA.length] as string;
