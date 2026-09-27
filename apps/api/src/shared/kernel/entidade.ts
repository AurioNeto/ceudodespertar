export abstract class Entidade<Id> {
  readonly id: Id;

  protected constructor(id: Id) {
    this.id = id;
  }

  igual(outra: Entidade<Id>): boolean {
    return this.id === outra.id;
  }
}
