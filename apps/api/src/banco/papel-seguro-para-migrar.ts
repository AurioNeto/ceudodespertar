export interface AtributosDoPapelConectado {
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly donoDoBanco: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly papeisPrivilegiadosHerdados: readonly string[];
}

export class PapelHerdaPrivilegioError extends Error {
  constructor(readonly papeisHerdados: readonly string[]) {
    super(
      `O papel conectado por BANCO_URL_MIGRACAO herda privilégio amplo por pertencer a: ${papeisHerdados.join(', ')}. ` +
      'Remova a associação ou use um papel que não seja membro de papéis privilegiados.',
    );
    this.name = 'PapelHerdaPrivilegioError';
  }
}

export interface PropriedadeDosEsquemas {
  readonly podeCriarEsquemas: boolean;
  readonly esquemasDeOutroDono: readonly string[];
  readonly historicoDeOutroDono: boolean;
}

export function papelConectadoEhSeguroParaMigrar(
  atributos: AtributosDoPapelConectado,
  escopo: 'banco' | 'esquemas' = 'banco',
  propriedade?: PropriedadeDosEsquemas,
): boolean {
  const donoDoDestino = escopo === 'banco'
    ? atributos.currentUser === atributos.donoDoBanco
    : atributos.currentUser === 'cdd_owner' &&
      propriedade?.podeCriarEsquemas === true &&
      propriedade.esquemasDeOutroDono.length === 0 &&
      !propriedade.historicoDeOutroDono;

  return (
    atributos.sessionUser === atributos.currentUser &&
    donoDoDestino &&
    !atributos.rolsuper &&
    !atributos.rolbypassrls &&
    atributos.papeisPrivilegiadosHerdados.length === 0
  );
}
