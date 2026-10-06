import { DriverException, OptimisticLockError } from '@mikro-orm/core';
import { DatabaseError } from 'pg';

export function erroDoPgComSqlstate(mensagem: string, code: string, constraint?: string): Error {
  return Object.assign(new DatabaseError(mensagem, 0, 'error'), constraint === undefined ? { code } : { code, constraint });
}

export function erroDoDriverComSqlstate(mensagem: string, code: string, constraint?: string): Error {
  return new DriverException(Object.assign(new Error(mensagem), constraint === undefined ? { code } : { code, constraint }));
}

export function erroDeVersaoDesatualizada(entidade: string): Error {
  return OptimisticLockError.lockFailed(entidade);
}
