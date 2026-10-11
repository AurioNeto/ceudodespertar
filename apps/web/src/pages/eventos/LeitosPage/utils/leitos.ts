import type { Dormitorio } from '@cdd/contracts';

export const identificacaoDe = (dormitorios: readonly Dormitorio[], leitoId: string) =>
  dormitorios.flatMap((d) => d.leitos).find((l) => (l.id as string) === leitoId)?.identificacao ?? leitoId;
