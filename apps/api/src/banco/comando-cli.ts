export const SUBCOMANDOS_DO_MIGRADOR = ['migrar', 'situacao'] as const;

export type SubcomandoDoMigrador = (typeof SUBCOMANDOS_DO_MIGRADOR)[number];

export interface ComandoDoMigrador {
  readonly subcomando: SubcomandoDoMigrador;
}

function mensagemDeComandoInvalido(argumentos: readonly string[]): string {
  const subcomandosValidos = `Use um destes: ${SUBCOMANDOS_DO_MIGRADOR.join(', ')}.`;
  if (argumentos.length === 1) {
    return `Subcomando inválido: '${argumentos[0]}'. ${subcomandosValidos}`;
  }
  return `Esperado exatamente um subcomando (recebidos ${argumentos.length}). ${subcomandosValidos}`;
}

export class ErroDeComandoInvalido extends Error {
  constructor(argumentos: readonly string[]) {
    super(mensagemDeComandoInvalido(argumentos));
    this.name = 'ErroDeComandoInvalido';
  }
}

function ehSubcomandoValido(valor: string | undefined): valor is SubcomandoDoMigrador {
  return SUBCOMANDOS_DO_MIGRADOR.includes(valor as SubcomandoDoMigrador);
}

export function analisarComandoDoMigrador(argumentos: readonly string[]): ComandoDoMigrador {
  const [subcomando] = argumentos;
  if (argumentos.length !== 1 || !ehSubcomandoValido(subcomando)) {
    throw new ErroDeComandoInvalido(argumentos);
  }
  return { subcomando };
}
