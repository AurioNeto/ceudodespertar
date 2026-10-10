export class KeycloakIndisponivel extends Error {
  constructor(readonly motivo: string) {
    super(`Keycloak indisponível: ${motivo}`);
    this.name = 'KeycloakIndisponivel';
  }
}

export class KeycloakRecusou extends Error {
  constructor(readonly status: number) {
    super(`Keycloak recusou a requisição com status ${status}`);
    this.name = 'KeycloakRecusou';
  }
}

export class UsuarioNaoExisteNoKeycloak extends Error {
  constructor() {
    super('Usuário não existe no Keycloak');
    this.name = 'UsuarioNaoExisteNoKeycloak';
  }
}
