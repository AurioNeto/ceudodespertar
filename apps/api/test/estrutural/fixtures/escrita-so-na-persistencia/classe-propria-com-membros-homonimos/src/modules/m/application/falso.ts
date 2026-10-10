
export class Falso {
  insertInto(_tabela: string): Falso {
    return this;
  }

  execute(): void {}

  fork(): Falso {
    return this;
  }
}

export function usar(falso: Falso) {
  falso.insertInto('t').execute();
  falso.fork();
}
