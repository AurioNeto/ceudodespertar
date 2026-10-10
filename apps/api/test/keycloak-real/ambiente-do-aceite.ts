export interface AmbienteDoAceite {
  readonly urlDaApi: string;
  readonly urlDoKeycloak: string;
  readonly urlDoMailpit: string;
  readonly emissor: string;
  readonly realm: string;
  readonly segredoDaContaDeServico: string;
  readonly senhaDoUsuarioDev: string;
  readonly urlDoBancoDoDono: string;
}

const REALM = 'cdd';

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (valor === undefined || valor === '') {
    throw new Error(`${nome} é obrigatória para o aceite contra o Keycloak real; rode pelo script test:keycloak`);
  }
  return valor;
}

export function lerAmbienteDoAceite(): AmbienteDoAceite {
  const urlDoKeycloak = `http://localhost:${obrigatoria('ACEITE_PORTA_KEYCLOAK')}`;
  return {
    urlDaApi: `http://localhost:${obrigatoria('ACEITE_PORTA_API')}`,
    urlDoKeycloak,
    urlDoMailpit: `http://localhost:${obrigatoria('ACEITE_PORTA_MAILPIT')}`,
    emissor: `${urlDoKeycloak}/realms/${REALM}`,
    realm: REALM,
    segredoDaContaDeServico: obrigatoria('CDD_KC_ADMIN_SEGREDO'),
    senhaDoUsuarioDev: obrigatoria('CDD_KC_DEV_SENHA'),
    urlDoBancoDoDono: `postgres://cdd_owner:${obrigatoria('CDD_OWNER_SENHA')}@localhost:${obrigatoria('ACEITE_PORTA_POSTGRES')}/cdd`,
  };
}
