export const SUBCOMANDOS_DO_MIGRADOR = ['migrar', 'situacao'] as const;

export type SubcomandoDoMigrador = (typeof SUBCOMANDOS_DO_MIGRADOR)[number];

export interface ComandoDoMigrador {
  readonly subcomando: SubcomandoDoMigrador;
}

export class ErroDeComandoInvalido extends Error {
  constructor(readonly recebido: string | undefined) {
    super(
      `Subcomando inválido: '${recebido ?? ''}'. Use um destes: ${SUBCOMANDOS_DO_MIGRADOR.join(', ')}.`,
    );
    this.name = 'ErroDeComandoInvalido';
  }
}

function ehSubcomandoValido(valor: string | undefined): valor is SubcomandoDoMigrador {
  return SUBCOMANDOS_DO_MIGRADOR.includes(valor as SubcomandoDoMigrador);
}

export function analisarComandoDoMigrador(argumentos: readonly string[]): ComandoDoMigrador {
  const [subcomando] = argumentos;
  if (!ehSubcomandoValido(subcomando)) {
    throw new ErroDeComandoInvalido(subcomando);
  }
  return { subcomando };
}
