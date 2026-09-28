import { AsyncLocalStorage } from 'node:async_hooks';

export interface ContextoDaRequisicaoValor {
  readonly correlacaoId: string;
  readonly instituicaoId?: string;
  readonly usuarioId?: string;
}

const armazenamento = new AsyncLocalStorage<ContextoDaRequisicaoValor>();

export class ContextoDaRequisicao {
  static executar<T>(valor: ContextoDaRequisicaoValor, fn: () => T): T {
    return armazenamento.run(valor, fn);
  }

  static atual(): ContextoDaRequisicaoValor | undefined {
    return armazenamento.getStore();
  }
}
