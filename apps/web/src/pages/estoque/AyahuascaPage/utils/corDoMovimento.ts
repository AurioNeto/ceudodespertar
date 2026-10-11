import type { MovimentoDeDaime } from '../mocks/ayahuasca';

export const corDoMovimento = (tipo: MovimentoDeDaime['tipo']) =>
  tipo === 'entrada'
    ? 'var(--color-confirmed)'
    : tipo === 'perda'
      ? 'var(--color-attention)'
      : tipo === 'transferencia'
        ? 'var(--color-royal)'
        : 'var(--text-primary)';
