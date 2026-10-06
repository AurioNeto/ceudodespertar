import { HttpException, HttpStatus } from '@nestjs/common';
import type { CorpoDeErro } from '@cdd/contracts';

export function erroDeChaveDeIdempotenciaReutilizada(correlacaoId: string | undefined): HttpException {
  const corpo: CorpoDeErro = {
    erro: 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA',
    correlacaoId: correlacaoId ?? '',
  };
  return new HttpException(corpo, HttpStatus.UNPROCESSABLE_ENTITY);
}
