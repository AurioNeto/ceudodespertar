export const AMBIENTE_DO_KEYCLOAK_DE_TESTE = {
  KEYCLOAK_URL_BASE: 'http://localhost:8080',
  KEYCLOAK_REALM: 'cdd',
  KEYCLOAK_ADMIN_CLIENT_ID: 'cdd-api-admin',
  CDD_KC_ADMIN_SEGREDO: 'segredo-de-teste-da-conta-de-servico',
  APP_URL_BASE: 'http://localhost:5173',
  KEYCLOAK_CLIENT_ID_DO_CONVITE: 'cdd-web',
} as const;
