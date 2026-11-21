export interface AtributosDoPapelConectado {
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly donoDoBanco: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
}

export function papelConectadoEhSeguroParaMigrar(atributos: AtributosDoPapelConectado): boolean {
  return (
    atributos.sessionUser === atributos.currentUser &&
    atributos.currentUser === atributos.donoDoBanco &&
    !atributos.rolsuper &&
    !atributos.rolbypassrls
  );
}
