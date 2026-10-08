import { SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

export const CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY = 'cdd:resposta-sem-corpo-no-replay';

export const RespostaSemCorpoNoReplay = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY, true);

export function rotaGuardaRespostaSemCorpo(contexto: ExecutionContext): boolean {
  return [contexto.getHandler(), contexto.getClass()].some(
    (alvo) => Reflect.getMetadata(CHAVE_DA_RESPOSTA_SEM_CORPO_NO_REPLAY, alvo) === true,
  );
}
