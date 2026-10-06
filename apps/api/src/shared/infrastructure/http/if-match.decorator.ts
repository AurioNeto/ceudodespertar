import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';

const PADRAO_DA_VERSAO = /^(?:"(0|[1-9]\d{0,9})"|(0|[1-9]\d{0,9}))$/;
const MAIOR_VERSAO_DO_BANCO = 2_147_483_647;

interface RequisicaoComCabecalhos {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export function versaoDoIfMatch(cabecalho: string | undefined): number | undefined {
  const casamento = cabecalho === undefined ? null : PADRAO_DA_VERSAO.exec(cabecalho);
  if (casamento === null) return undefined;

  const versao = Number(casamento[1] ?? casamento[2]);
  return versao <= MAIOR_VERSAO_DO_BANCO ? versao : undefined;
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
