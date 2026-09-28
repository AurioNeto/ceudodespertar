import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { IdentidadeDaRequisicao } from './provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';

@Injectable()
export class ProvedorDeContextoDeInstituicaoFake extends ProvedorDeContextoDeInstituicao {
  private identidade: IdentidadeDaRequisicao = {};

  definir(identidade: IdentidadeDaRequisicao): void {
    this.identidade = identidade;
  }

  limpar(): void {
    this.identidade = {};
  }

  identidadeAtual(_contexto: ExecutionContext): IdentidadeDaRequisicao {
    return this.identidade;
  }
}
