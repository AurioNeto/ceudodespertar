import type { UsuarioId } from '@cdd/contracts';

export abstract class PersistenciaDoBootstrap {
  abstract adquirirTravaGlobal(): Promise<void>;
  abstract jaFoiExecutado(): Promise<boolean>;
  abstract criarInstituicao(id: string, nome: string): Promise<void>;
  abstract registrarExecucao(adminUsuarioId: UsuarioId, em: Date): Promise<void>;
}
