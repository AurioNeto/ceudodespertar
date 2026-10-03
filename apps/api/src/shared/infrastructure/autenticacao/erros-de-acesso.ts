import { HttpException, HttpStatus } from '@nestjs/common';
import type { CodigoDeErro, CorpoDeErro } from '@cdd/contracts';

const CORRELACAO_PENDENTE = '';

function erroHttp(status: HttpStatus, erro: CodigoDeErro): HttpException {
  const corpo: CorpoDeErro = { erro, correlacaoId: CORRELACAO_PENDENTE };
  return new HttpException(corpo, status);
}

export function naoAutenticado(codigo: CodigoDeErro = 'NAO_AUTENTICADO'): HttpException {
  return erroHttp(HttpStatus.UNAUTHORIZED, codigo);
}

export function semPermissao(): HttpException {
  return erroHttp(HttpStatus.FORBIDDEN, 'SEM_PERMISSAO');
}

export function erroDeConfiguracaoDeAcesso(): HttpException {
  return erroHttp(HttpStatus.INTERNAL_SERVER_ERROR, 'ERRO_INTERNO');
}

export function provedorDeIdentidadeIndisponivel(): HttpException {
  return erroHttp(HttpStatus.SERVICE_UNAVAILABLE, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL');
}
