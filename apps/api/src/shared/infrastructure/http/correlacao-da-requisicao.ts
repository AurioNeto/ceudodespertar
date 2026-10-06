const CHAVE_DA_CORRELACAO = Symbol('correlacaoDaRequisicao');

interface RequisicaoComCorrelacao {
  [CHAVE_DA_CORRELACAO]?: string;
}

export function gravarCorrelacaoNaRequisicao(requisicao: object, correlacaoId: string): void {
  (requisicao as RequisicaoComCorrelacao)[CHAVE_DA_CORRELACAO] = correlacaoId;
}

export function lerCorrelacaoDaRequisicao(requisicao: object | undefined): string | undefined {
  return requisicao === undefined ? undefined : (requisicao as RequisicaoComCorrelacao)[CHAVE_DA_CORRELACAO];
}
