import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { IdentidadeDaRequisicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';

const IDENTIDADE_VAZIA: IdentidadeDaRequisicao = {};

@Injectable()
export class ProvedorDeContextoDeInstituicaoVazio extends ProvedorDeContextoDeInstituicao {
  identidadeAtual(_contexto: ExecutionContext): IdentidadeDaRequisicao {
    return IDENTIDADE_VAZIA;
  }
}
