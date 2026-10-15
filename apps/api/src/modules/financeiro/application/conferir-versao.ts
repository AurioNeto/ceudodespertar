import { erroDeDominio, type ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../shared/kernel/result.js';

interface AgregadoVersionado {
  readonly versao: number;
}

export function conferirVersao<A extends AgregadoVersionado>(
  agregado: A | undefined,
  versaoEsperada: number,
): Result<A, ErroDeDominio> {
  if (agregado === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
  if (agregado.versao !== versaoEsperada) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
  return ok(agregado);
}
