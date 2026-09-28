import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';

const PREFIXO_DE_VALIDADOR_FRACO = /^W\//;
const ASPAS_DA_BORDA = /^"|"$/g;

interface RequisicaoComCabecalhos {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

export function versaoDoIfMatch(cabecalho: string | undefined): number | undefined {
  if (cabecalho === undefined) return undefined;

  const semAspas = cabecalho.replace(PREFIXO_DE_VALIDADOR_FRACO, '').replace(ASPAS_DA_BORDA, '').trim();
  if (semAspas.length === 0) return undefined;

  const versao = Number(semAspas);
  return Number.isInteger(versao) && versao >= 0 ? versao : undefined;
}

export const IfMatch = createParamDecorator((_dado: unknown, contexto: ExecutionContext): number => {
  const requisicao = contexto.switchToHttp().getRequest<RequisicaoComCabecalhos>();
  const cabecalho = requisicao.headers['if-match'];
  const versao = versaoDoIfMatch(typeof cabecalho === 'string' ? cabecalho : undefined);

  if (versao === undefined) {
    throw new ErroDeDominioException(erroDeDominio('VERSAO_OBRIGATORIA'));
  }

  return versao;
});
