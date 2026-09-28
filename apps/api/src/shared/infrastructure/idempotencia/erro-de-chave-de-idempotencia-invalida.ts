import { HttpException, HttpStatus } from '@nestjs/common';
import type { CorpoDeErro } from '@cdd/contracts';

export function erroDeChaveDeIdempotenciaInvalida(correlacaoId: string | undefined): HttpException {
  const corpo: CorpoDeErro = {
    erro: 'CORPO_INVALIDO',
    correlacaoId: correlacaoId ?? '',
  };
  return new HttpException(corpo, HttpStatus.BAD_REQUEST);
}
