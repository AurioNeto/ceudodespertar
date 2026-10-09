import type { GrupoDaGestao } from '@cdd/contracts';

export abstract class LeitorDeGrupos {
  abstract listar(): Promise<GrupoDaGestao[]>;
}
