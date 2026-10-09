import { SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

export const CHAVE_DE_SEM_IDEMPOTENCIA = 'cdd:sem-idempotencia';

export const SemIdempotencia = (): MethodDecorator & ClassDecorator => SetMetadata(CHAVE_DE_SEM_IDEMPOTENCIA, true);

export function rotaEhSemIdempotencia(contexto: ExecutionContext): boolean {
  return [contexto.getHandler(), contexto.getClass()].some(
    (alvo) => Reflect.getMetadata(CHAVE_DE_SEM_IDEMPOTENCIA, alvo) === true,
  );
}
