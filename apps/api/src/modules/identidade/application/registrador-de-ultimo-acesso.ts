import type { InstituicaoId, UsuarioId } from '@cdd/contracts';

export interface PedidoDeRegistroDeAcesso {
  readonly usuarioId: UsuarioId;
  readonly instituicaoId: InstituicaoId;
  readonly em: Date;
  readonly seUltimoAcessoAnteriorA: Date;
}

export abstract class RegistradorDeUltimoAcesso {
  abstract registrar(pedido: PedidoDeRegistroDeAcesso): Promise<void>;
}
