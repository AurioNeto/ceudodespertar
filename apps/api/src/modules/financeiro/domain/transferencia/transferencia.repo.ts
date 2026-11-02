import type { StatusGravadoDoLancamento, TransferenciaId } from '@cdd/contracts';
import type { Transferencia } from './transferencia.js';

export interface EstornoDaTransferencia {
  readonly id: TransferenciaId;
  readonly status: StatusGravadoDoLancamento;
}

export abstract class RepositorioDeTransferencia {
  abstract porId(id: TransferenciaId): Promise<Transferencia | undefined>;
  abstract estornoDe(id: TransferenciaId): Promise<EstornoDaTransferencia | undefined>;
  abstract adicionar(transferencia: Transferencia): Promise<void>;
  abstract salvar(transferencia: Transferencia): Promise<number>;
  abstract excluir(transferencia: Transferencia): Promise<void>;
}
