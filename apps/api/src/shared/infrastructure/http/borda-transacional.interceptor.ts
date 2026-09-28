import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { lastValueFrom, of } from 'rxjs';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import type { ContextoDaRequisicaoValor } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import type { ModoDeTransacao } from '../banco/unidade-de-trabalho.js';
import { CHAVE_DO_MODO_DE_TRANSACAO } from './modo-de-transacao.decorator.js';
import { ProvedorDeContextoDeInstituicao } from './provedor-de-contexto-de-instituicao.js';
import { gravarCorrelacaoNaRequisicao } from './correlacao-da-requisicao.js';

export const MODO_PADRAO_SEM_MARCA: ModoDeTransacao = 'leitura';

@Injectable()
export class BordaTransacionalInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly provedorDeContexto: ProvedorDeContextoDeInstituicao,
  ) {}

  async intercept(contexto: ExecutionContext, proximo: CallHandler): Promise<Observable<unknown>> {
    const modo =
      this.reflector.getAllAndOverride<ModoDeTransacao | undefined>(CHAVE_DO_MODO_DE_TRANSACAO, [
        contexto.getHandler(),
        contexto.getClass(),
      ]) ?? MODO_PADRAO_SEM_MARCA;

    const identidade = this.provedorDeContexto.identidadeAtual(contexto);
    const valorDoContexto: ContextoDaRequisicaoValor = {
      correlacaoId: randomUUID(),
      instituicaoId: identidade.instituicaoId,
      usuarioId: identidade.usuarioId,
    };

    gravarCorrelacaoNaRequisicao(contexto.switchToHttp().getRequest<object>(), valorDoContexto.correlacaoId);

    const resposta = await ContextoDaRequisicao.executar(valorDoContexto, () =>
      this.unidadeDeTrabalho.transacao(modo, () =>
        lastValueFrom(proximo.handle(), { defaultValue: undefined }),
      ),
    );

    return of(resposta);
  }
}
