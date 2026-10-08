import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { contextoDeAcessoDaRequisicao } from '../autenticacao/requisicao-autenticada.js';
import type { RequisicaoHttp } from '../autenticacao/requisicao-autenticada.js';
import type { IdentidadeDaRequisicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';

@Injectable()
export class ProvedorDeContextoDeInstituicaoDoAcesso extends ProvedorDeContextoDeInstituicao {
  identidadeAtual(contexto: ExecutionContext): IdentidadeDaRequisicao {
    const acesso = contextoDeAcessoDaRequisicao(contexto.switchToHttp().getRequest<RequisicaoHttp>());
    return { instituicaoId: acesso?.instituicaoId, usuarioId: acesso?.usuarioId };
  }
}
