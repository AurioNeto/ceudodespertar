import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';

const PADRAO_DA_VERSAO = /^"?(0|[1-9]\d{0,9})"?$/;

interface RequisicaoComCabecalhos {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export function versaoDoIfMatch(cabecalho: string | undefined): number | undefined {
  if (cabecalho === undefined || !PADRAO_DA_VERSAO.test(cabecalho)) return undefined;

  const versao = Number(cabecalho.replace(/"/g, ''));
  return Number.isSafeInteger(versao) ? versao : undefined;
}

export const IfMatch = createParamDecorator((_dado: unknown, contexto: ExecutionContext): number => {
  const requisicao = contexto.switchToHttp().getRequest<RequisicaoComCabecalhos>();
  const cabecalho = requisicao.headers['if-match'];

  if (cabecalho === undefined) {
    throw new ErroDeDominioException(erroDeDominio('VERSAO_OBRIGATORIA'));
  }

  const versao = typeof cabecalho === 'string' ? versaoDoIfMatch(cabecalho) : undefined;

  if (versao === undefined) {
    throw new ErroDeDominioException(erroDeDominio('CORPO_INVALIDO'));
  }

  return versao;
});
