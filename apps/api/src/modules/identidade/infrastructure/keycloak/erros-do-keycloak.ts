import { FalhaNoEnvioDoConvite } from '../../application/convite/enviador-de-convite.js';

export class KeycloakIndisponivel extends FalhaNoEnvioDoConvite {
  constructor(readonly motivo: string) {
    super('KeycloakIndisponivel', motivo);
  }
}

export class KeycloakRecusou extends FalhaNoEnvioDoConvite {
  constructor(readonly status: number) {
    super('KeycloakRecusou', `status ${status}`);
  }
}

export class UsuarioNaoExisteNoKeycloak extends Error {
  constructor() {
    super('Usuário não existe no Keycloak');
    this.name = 'UsuarioNaoExisteNoKeycloak';
  }
}

export class ConviteExpiradoAntesDoEnvio extends Error {
  constructor() {
    super('Convite expirou antes do envio do e-mail de ações');
    this.name = 'ConviteExpiradoAntesDoEnvio';
  }
}
