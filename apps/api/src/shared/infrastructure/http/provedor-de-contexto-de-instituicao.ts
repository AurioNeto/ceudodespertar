export interface IdentidadeDaRequisicao {
  readonly instituicaoId?: string;
  readonly usuarioId?: string;
}

export abstract class ProvedorDeContextoDeInstituicao {
  abstract identidadeAtual(): IdentidadeDaRequisicao;
}
