import { DriverException, OptimisticLockError } from '@mikro-orm/core';
import { DatabaseError } from 'pg';

export interface ErroDeBanco {
  readonly code: string;
  readonly constraint?: string;
  readonly message: string;
}

const PADRAO_SQLSTATE = /^[0-9A-Z]{5}$/;

export function ehVersaoDesatualizada(valor: unknown): boolean {
  return valor instanceof OptimisticLockError;
}

export function ehErroDeBanco(valor: unknown): valor is ErroDeBanco {
  if (!(valor instanceof DatabaseError) && !(valor instanceof DriverException)) return false;

  const codigo = (valor as { code?: unknown }).code;
  return typeof codigo === 'string' && PADRAO_SQLSTATE.test(codigo);
}
