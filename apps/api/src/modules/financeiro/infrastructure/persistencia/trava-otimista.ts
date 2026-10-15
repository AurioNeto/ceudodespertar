import { OptimisticLockError } from '@mikro-orm/core';
import type { UpdateResult } from 'kysely';

export function exigirLinhaAtualizada(resultado: UpdateResult, nomeDoAgregado: string): void {
  if (resultado.numUpdatedRows === 0n) throw OptimisticLockError.lockFailed(nomeDoAgregado);
}
