import type { UsuarioId } from '@cdd/contracts';

export interface ConviteParaEnviar {
  readonly usuarioId: UsuarioId;
  readonly email: string;
  readonly nome: string;
  readonly token: string;
  readonly expiraEm: Date;
}

export class FalhaNoEnvioDoConvite extends Error {
  constructor(
    nome: string,
    readonly diagnostico: string,
  ) {
    super(`${nome}: ${diagnostico}`);
    this.name = nome;
  }
}

export abstract class EnviadorDeConvite {
  abstract enviar(convite: ConviteParaEnviar): Promise<void>;
}
