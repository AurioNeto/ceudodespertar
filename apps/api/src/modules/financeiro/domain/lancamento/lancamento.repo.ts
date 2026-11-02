import type { LancamentoId } from '@cdd/contracts';
import type { Lancamento } from './lancamento.js';

export abstract class RepositorioDeLancamento {
  abstract porId(id: LancamentoId): Promise<Lancamento | undefined>;
  abstract estornoDe(id: LancamentoId): Promise<LancamentoId | undefined>;
  abstract adicionar(lancamento: Lancamento): Promise<void>;
  abstract salvar(lancamento: Lancamento): Promise<number>;
  abstract excluir(lancamento: Lancamento): Promise<void>;
}
