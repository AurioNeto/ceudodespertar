import { ContextoDaRequisicao } from '../../../../shared/infrastructure/contexto-da-requisicao.js';

export class ErroDeInstituicaoAusenteNaPersistencia extends Error {
  constructor() {
    super('não há instituição ativa no contexto da requisição para gravar o agregado');
    this.name = 'ErroDeInstituicaoAusenteNaPersistencia';
  }
}

export function instituicaoDoContexto(): string {
  const instituicaoId = ContextoDaRequisicao.atual()?.instituicaoId;
  if (instituicaoId === undefined) throw new ErroDeInstituicaoAusenteNaPersistencia();
  return instituicaoId;
}
