import type { hospedes, NoiteId } from './mocks/leitos';

export type Aba = 'mapa' | 'cadastro';

/** `leitoId → noiteId → inscricaoIds`. Lista por causa da cama de casal. */
export type Alocacao = Record<string, Record<string, string[]>>;

export interface Pendencia {
  hospede: (typeof hospedes)[number];
  faltam: readonly NoiteId[];
}
