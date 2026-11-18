import type { AnexoId, UsuarioId } from '@cdd/contracts';

export interface ComprovanteGravado {
  readonly id: AnexoId;
  readonly chave: string;
  readonly nome: string;
  readonly mime: string;
  readonly tamanhoBytes: number;
  readonly sha256: string;
}

export abstract class RepositorioDeComprovantes {
  abstract adicionar(comprovante: ComprovanteGravado, autor: UsuarioId): Promise<void>;
  abstract porId(id: AnexoId): Promise<ComprovanteGravado | undefined>;
}
