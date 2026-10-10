import type { EntityManager } from '@mikro-orm/postgresql';

class Entidade {}

export class ApagarController {
  constructor(private readonly em: EntityManager) {}

  async apagar() {
    await this.em.nativeDelete(Entidade, {});
  }
}
