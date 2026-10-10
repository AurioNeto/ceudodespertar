import type { Ambiente } from '../../../../shared/infrastructure/configuracao/esquema-de-ambiente.js';

export const TIMEOUT_POR_CHAMADA_EM_MS = 3_000;
export const ORCAMENTO_DA_OPERACAO_EM_MS = 15_000;

export const CONFIGURACAO_DO_KEYCLOAK = Symbol('CONFIGURACAO_DO_KEYCLOAK');
export const CONFIGURACAO_DO_CONVITE_NO_KEYCLOAK = Symbol('CONFIGURACAO_DO_CONVITE_NO_KEYCLOAK');

export interface ConfiguracaoDoKeycloak {
  readonly urlBase: string;
  readonly realm: string;
  readonly clientId: string;
  readonly segredo: string;
  readonly timeoutPorChamadaEmMs: number;
  readonly orcamentoDaOperacaoEmMs: number;
}

export interface ConfiguracaoDoConviteNoKeycloak {
  readonly urlBaseDoApp: string;
  readonly clientIdDoConvite: string;
}

export function configuracaoDoKeycloakDe(ambiente: Ambiente): ConfiguracaoDoKeycloak {
  return {
    urlBase: ambiente.KEYCLOAK_URL_BASE,
    realm: ambiente.KEYCLOAK_REALM,
    clientId: ambiente.KEYCLOAK_ADMIN_CLIENT_ID,
    segredo: ambiente.CDD_KC_ADMIN_SEGREDO,
    timeoutPorChamadaEmMs: TIMEOUT_POR_CHAMADA_EM_MS,
    orcamentoDaOperacaoEmMs: ORCAMENTO_DA_OPERACAO_EM_MS,
  };
}

export function configuracaoDoConviteDe(ambiente: Ambiente): ConfiguracaoDoConviteNoKeycloak {
  return {
    urlBaseDoApp: ambiente.APP_URL_BASE,
    clientIdDoConvite: ambiente.KEYCLOAK_CLIENT_ID_DO_CONVITE,
  };
}
