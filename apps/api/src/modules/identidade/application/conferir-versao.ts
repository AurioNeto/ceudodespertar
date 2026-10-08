import { erroDeDominio, type ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { err, ok, type Result } from '../../../shared/kernel/result.js';

interface AgregadoVersionado {
  readonly versao: number;
}

interface AgregadoComEventos extends AgregadoVersionado {
  readonly possuiEventosPendentes: boolean;
}

export function conferirVersao<A extends AgregadoVersionado>(
  agregado: A | undefined,
  versaoEsperada: number,
): Result<A, ErroDeDominio> {
  if (agregado === undefined) return err(erroDeDominio('RECURSO_NAO_ENCONTRADO'));
  if (agregado.versao !== versaoEsperada) return err(erroDeDominio('VERSAO_DESATUALIZADA'));
  return ok(agregado);
}

export async function salvarSeAlterado<A extends AgregadoComEventos>(
  repositorio: { salvar(agregado: A): Promise<number> },
  agregado: A,
): Promise<number> {
  return agregado.possuiEventosPendentes ? repositorio.salvar(agregado) : agregado.versao;
}
