export interface ResultadoOk<T> {
  readonly tipo: 'ok';
  readonly valor: T;
}

export interface ResultadoErro<E> {
  readonly tipo: 'erro';
  readonly erro: E;
}

export type Result<T, E> = ResultadoOk<T> | ResultadoErro<E>;

export function ok(): Result<void, never>;
export function ok<T>(valor: T): Result<T, never>;
export function ok<T>(valor?: T): Result<T | undefined, never> {
  return { tipo: 'ok', valor };
}

export function err<E>(erro: E): Result<never, E> {
  return { tipo: 'erro', erro };
}

export function ehOk<T, E>(resultado: Result<T, E>): resultado is ResultadoOk<T> {
  return resultado.tipo === 'ok';
}

export function ehErr<T, E>(resultado: Result<T, E>): resultado is ResultadoErro<E> {
  return resultado.tipo === 'erro';
}

export function ehResultadoDeErro(valor: unknown): valor is ResultadoErro<unknown> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    (valor as { tipo?: unknown }).tipo === 'erro' &&
    'erro' in valor
  );
}

export function ehResultadoDeSucesso(valor: unknown): valor is ResultadoOk<unknown> {
  return (
    typeof valor === 'object' &&
    valor !== null &&
    (valor as { tipo?: unknown }).tipo === 'ok' &&
    'valor' in valor
  );
}

export function mapear<T, E, U>(resultado: Result<T, E>, transformar: (valor: T) => U): Result<U, E> {
  return ehOk(resultado) ? ok(transformar(resultado.valor)) : resultado;
}

export function mapearErro<T, E, F>(resultado: Result<T, E>, transformar: (erro: E) => F): Result<T, F> {
  return ehErr(resultado) ? err(transformar(resultado.erro)) : resultado;
}

export function encadear<T, E, U, F>(
  resultado: Result<T, E>,
  continuar: (valor: T) => Result<U, F>,
): Result<U, E | F> {
  return ehOk(resultado) ? continuar(resultado.valor) : resultado;
}

export function desembrulharOuLancar<T, E>(resultado: Result<T, E>, criarErro: (erro: E) => Error): T {
  if (ehErr(resultado)) throw criarErro(resultado.erro);
  return resultado.valor;
}
