import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const diretorioDoScript = dirname(fileURLToPath(import.meta.url));
const caminhoDoRealm = join(diretorioDoScript, 'realm-cdd.json');
const caminhoDosTemas = join(diretorioDoScript, 'themes');

const falhas = [];

function exigir(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

function ehPlaceholderDeAmbiente(valor) {
  return typeof valor === 'string' && /^\$\{[A-Z][A-Z0-9_]*\}$/.test(valor);
}

function exigirChavesFechadas(objeto, chavesEsperadas, rotulo) {
  const chavesAtuais = Object.keys(objeto ?? {}).sort();
  const esperadas = [...chavesEsperadas].sort();
  exigir(
    chavesAtuais.length === esperadas.length && chavesAtuais.every((chave, indice) => chave === esperadas[indice]),
    `${rotulo} precisa ter exatamente as chaves ${JSON.stringify(esperadas)}, encontrado ${JSON.stringify(chavesAtuais)}`,
  );
}

function exigirObjetoFechado(objeto, esperado, rotulo) {
  exigirChavesFechadas(objeto, Object.keys(esperado), rotulo);
  for (const [chave, valorEsperado] of Object.entries(esperado)) {
    exigir(
      (objeto ?? {})[chave] === valorEsperado,
      `${rotulo}["${chave}"] precisa ser exatamente ${JSON.stringify(valorEsperado)}, encontrado ${JSON.stringify((objeto ?? {})[chave])}`,
    );
  }
}

function exigirArrayFechado(valorAtual, valoresEsperados, rotulo) {
  exigir(Array.isArray(valorAtual), `${rotulo} precisa ser um array (Array.isArray)`);
  const atual = [...(Array.isArray(valorAtual) ? valorAtual : [])].sort();
  const esperado = [...valoresEsperados].sort();
  exigir(
    atual.length === esperado.length && atual.every((valor, indice) => valor === esperado[indice]),
    `${rotulo} precisa ser exatamente ${JSON.stringify(valoresEsperados)}, encontrado ${JSON.stringify(valorAtual)}`,
  );
}

function exigirMapeadoresFechados(client, mapeadoresEsperados) {
  const atuais = client?.protocolMappers ?? [];
  const nomesEsperadosOrdenados = [...mapeadoresEsperados.map((mapeador) => mapeador.name)].sort();
  const nomesAtuaisOrdenados = atuais.map((mapeador) => mapeador.name).sort();
  exigir(
    nomesAtuaisOrdenados.length === nomesEsperadosOrdenados.length &&
      nomesAtuaisOrdenados.every((nome, indice) => nome === nomesEsperadosOrdenados[indice]),
    `${client.clientId}.protocolMappers precisa ter exatamente os nomes ${JSON.stringify(nomesEsperadosOrdenados)}, encontrado ${JSON.stringify(atuais.map((mapeador) => mapeador.name))}`,
  );

  for (const esperado of mapeadoresEsperados) {
    const atual = atuais.find((mapeador) => mapeador.name === esperado.name);
    if (!atual) continue;
    exigir(
      atual.protocol === 'openid-connect',
      `${client.clientId}.protocolMappers["${esperado.name}"].protocol precisa ser "openid-connect"`,
    );
    exigir(
      atual.protocolMapper === esperado.protocolMapper,
      `${client.clientId}.protocolMappers["${esperado.name}"].protocolMapper precisa ser "${esperado.protocolMapper}"`,
    );
    exigir(
      atual.consentRequired === false,
      `${client.clientId}.protocolMappers["${esperado.name}"].consentRequired precisa ser false`,
    );
    exigirObjetoFechado(
      atual.config,
      esperado.config,
      `${client.clientId}.protocolMappers["${esperado.name}"].config`,
    );
  }
}

const CLIENT_IDS_ESPERADOS = ['cdd-web', 'cdd-api-admin', 'cdd-teste', 'admin-cli'];
const USERNAMES_ESPERADOS = ['dev@cdd.local', 'service-account-cdd-api-admin'];

const REALM_CHAVES_OBRIGATORIAS = [
  'realm',
  'enabled',
  'registrationAllowed',
  'resetPasswordAllowed',
  'loginWithEmailAllowed',
  'duplicateEmailsAllowed',
  'editUsernameAllowed',
  'bruteForceProtected',
  'permanentLockout',
  'failureFactor',
  'waitIncrementSeconds',
  'quickLoginCheckMilliSeconds',
  'minimumQuickLoginWaitSeconds',
  'maxFailureWaitSeconds',
  'maxDeltaTimeSeconds',
  'passwordPolicy',
  'accessTokenLifespan',
  'ssoSessionIdleTimeout',
  'ssoSessionMaxLifespan',
  'revokeRefreshToken',
  'refreshTokenMaxReuse',
  'rememberMe',
  'offlineSessionMaxLifespanEnabled',
  'offlineSessionMaxLifespan',
  'internationalizationEnabled',
  'supportedLocales',
  'defaultLocale',
  'smtpServer',
  'clients',
  'users',
];
const REALM_CHAVES_OPCIONAIS = ['loginTheme'];
const REALM_CHAVES_PERMITIDAS = [...REALM_CHAVES_OBRIGATORIAS, ...REALM_CHAVES_OPCIONAIS];

const MAPEADOR_AUDIENCIA_CDD_API = {
  name: 'audiencia-cdd-api',
  protocolMapper: 'oidc-audience-mapper',
  config: {
    'included.client.audience': 'cdd-api',
    'id.token.claim': 'false',
    'access.token.claim': 'true',
  },
};

const MAPEADORES_SO_ID_TOKEN = [
  {
    name: 'nome-completo-so-id-token',
    protocolMapper: 'oidc-full-name-mapper',
    config: { 'id.token.claim': 'true', 'access.token.claim': 'false', 'userinfo.token.claim': 'true' },
  },
  {
    name: 'nome-preferido-so-id-token',
    protocolMapper: 'oidc-usermodel-attribute-mapper',
    config: {
      'user.attribute': 'username',
      'claim.name': 'preferred_username',
      'jsonType.label': 'String',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'true',
    },
  },
  {
    name: 'primeiro-nome-so-id-token',
    protocolMapper: 'oidc-usermodel-attribute-mapper',
    config: {
      'user.attribute': 'firstName',
      'claim.name': 'given_name',
      'jsonType.label': 'String',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'true',
    },
  },
  {
    name: 'sobrenome-so-id-token',
    protocolMapper: 'oidc-usermodel-attribute-mapper',
    config: {
      'user.attribute': 'lastName',
      'claim.name': 'family_name',
      'jsonType.label': 'String',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'true',
    },
  },
  {
    name: 'e-mail-so-id-token',
    protocolMapper: 'oidc-usermodel-attribute-mapper',
    config: {
      'user.attribute': 'email',
      'claim.name': 'email',
      'jsonType.label': 'String',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'true',
    },
  },
  {
    name: 'e-mail-verificado-so-id-token',
    protocolMapper: 'oidc-usermodel-property-mapper',
    config: {
      'user.attribute': 'emailVerified',
      'claim.name': 'email_verified',
      'jsonType.label': 'boolean',
      'id.token.claim': 'true',
      'access.token.claim': 'false',
      'userinfo.token.claim': 'true',
    },
  },
];

const CLIENTES_ESPERADOS = {
  'cdd-web': {
    chaves: [
      'clientId',
      'enabled',
      'protocol',
      'publicClient',
      'standardFlowEnabled',
      'directAccessGrantsEnabled',
      'implicitFlowEnabled',
      'serviceAccountsEnabled',
      'redirectUris',
      'webOrigins',
      'defaultClientScopes',
      'optionalClientScopes',
      'attributes',
      'protocolMappers',
    ],
    defaultClientScopes: ['web-origins', 'acr', 'roles', 'basic'],
    optionalClientScopes: [],
    protocolMappers: [MAPEADOR_AUDIENCIA_CDD_API, ...MAPEADORES_SO_ID_TOKEN],
  },
  'cdd-api-admin': {
    chaves: [
      'clientId',
      'enabled',
      'protocol',
      'publicClient',
      'clientAuthenticatorType',
      'secret',
      'standardFlowEnabled',
      'directAccessGrantsEnabled',
      'implicitFlowEnabled',
      'serviceAccountsEnabled',
      'defaultClientScopes',
      'optionalClientScopes',
      'description',
    ],
    defaultClientScopes: ['web-origins', 'acr', 'roles', 'basic'],
    optionalClientScopes: [],
    protocolMappers: [],
  },
  'cdd-teste': {
    chaves: [
      'clientId',
      'enabled',
      'protocol',
      'publicClient',
      'standardFlowEnabled',
      'directAccessGrantsEnabled',
      'implicitFlowEnabled',
      'serviceAccountsEnabled',
      'redirectUris',
      'defaultClientScopes',
      'optionalClientScopes',
      'description',
      'protocolMappers',
    ],
    defaultClientScopes: ['web-origins', 'acr', 'roles', 'basic'],
    optionalClientScopes: [],
    protocolMappers: [MAPEADOR_AUDIENCIA_CDD_API, ...MAPEADORES_SO_ID_TOKEN],
  },
  'admin-cli': {
    chaves: [
      'clientId',
      'name',
      'surrogateAuthRequired',
      'enabled',
      'alwaysDisplayInConsole',
      'clientAuthenticatorType',
      'redirectUris',
      'webOrigins',
      'notBefore',
      'bearerOnly',
      'consentRequired',
      'standardFlowEnabled',
      'implicitFlowEnabled',
      'directAccessGrantsEnabled',
      'serviceAccountsEnabled',
      'publicClient',
      'frontchannelLogout',
      'protocol',
      'attributes',
      'authenticationFlowBindingOverrides',
      'fullScopeAllowed',
      'nodeReRegistrationTimeout',
      'defaultClientScopes',
      'optionalClientScopes',
    ],
    defaultClientScopes: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    optionalClientScopes: ['address', 'phone', 'organization', 'microprofile-jwt'],
    protocolMappers: [],
  },
};

function encontrarClient(realm, clientId) {
  return (realm.clients ?? []).find((cliente) => cliente.clientId === clientId);
}

function encontrarUsuario(realm, username) {
  return (realm.users ?? []).find((usuario) => usuario.username === username);
}

function verificarPapeisDeContaDeServico(usuario, papeisEsperadosPorClient) {
  const clientRoles = usuario?.clientRoles ?? {};
  const clientesComPapel = Object.keys(clientRoles);
  exigir(
    clientesComPapel.length === Object.keys(papeisEsperadosPorClient).length &&
      clientesComPapel.every((client) => client in papeisEsperadosPorClient),
    `${usuario?.username ?? '(usuário)'} não pode ter clientRoles além de ${JSON.stringify(papeisEsperadosPorClient)}`,
  );
  for (const [client, papeisEsperados] of Object.entries(papeisEsperadosPorClient)) {
    const papeis = clientRoles[client] ?? [];
    exigir(
      papeis.length === papeisEsperados.length && papeisEsperados.every((papel) => papeis.includes(papel)),
      `${usuario?.username ?? '(usuário)'}.clientRoles["${client}"] precisa ser exatamente ${JSON.stringify(papeisEsperados)}`,
    );
  }
  exigir(
    !(usuario?.realmRoles ?? []).length,
    `${usuario?.username ?? '(usuário)'} não pode ter realmRoles`,
  );
}

function verificarConjuntoFechadoDeClientsEUsuarios(realm) {
  const clientIds = (realm.clients ?? []).map((client) => client.clientId).sort();
  const esperados = [...CLIENT_IDS_ESPERADOS].sort();
  exigir(
    clientIds.length === esperados.length && clientIds.every((id, indice) => id === esperados[indice]),
    `clients[].clientId precisa ser exatamente ${JSON.stringify(esperados)}, encontrado ${JSON.stringify(clientIds)}`,
  );

  const usernames = (realm.users ?? []).map((usuario) => usuario.username).sort();
  const usernamesEsperados = [...USERNAMES_ESPERADOS].sort();
  exigir(
    usernames.length === usernamesEsperados.length &&
      usernames.every((username, indice) => username === usernamesEsperados[indice]),
    `users[].username precisa ser exatamente ${JSON.stringify(usernamesEsperados)}, encontrado ${JSON.stringify(usernames)}`,
  );
}

function verificarAusenciaDeGruposEPapeisSoltos(realm) {
  exigir(realm.groups === undefined, 'realm.groups não pode existir (nenhum grupo no realm cdd)');
  exigir(realm.defaultGroups === undefined, 'realm.defaultGroups não pode existir');
  exigir(realm.roles === undefined, 'realm.roles não pode existir (nenhum papel de negócio no realm cdd)');
  exigir(realm.defaultRole === undefined, 'realm.defaultRole não pode existir');

  for (const usuario of realm.users ?? []) {
    exigir(
      !(usuario.groups ?? []).length,
      `${usuario.username ?? '(usuário)'} não pode pertencer a nenhum grupo`,
    );
  }
}

function verificarCredenciaisDeTodosOsUsuarios(realm) {
  for (const usuario of realm.users ?? []) {
    for (const credencial of usuario.credentials ?? []) {
      exigir(
        ehPlaceholderDeAmbiente(credencial.value),
        `${usuario.username ?? '(usuário)'} tem uma credencial (${credencial.type ?? '?'}) que não é placeholder de variável de ambiente`,
      );
    }
  }
}

function verificarClienteFechado(client) {
  if (!client) return;
  const esperado = CLIENTES_ESPERADOS[client.clientId];
  if (!esperado) return;

  exigirChavesFechadas(client, esperado.chaves, client.clientId);
  exigirArrayFechado(client.defaultClientScopes, esperado.defaultClientScopes, `${client.clientId}.defaultClientScopes`);
  exigirArrayFechado(client.optionalClientScopes, esperado.optionalClientScopes, `${client.clientId}.optionalClientScopes`);
  exigirMapeadoresFechados(client, esperado.protocolMappers);
}

function verificarRealm(realm) {
  for (const chave of REALM_CHAVES_OBRIGATORIAS) {
    exigir(chave in realm, `realm precisa ter a chave "${chave}"`);
  }
  for (const chave of Object.keys(realm)) {
    exigir(
      REALM_CHAVES_PERMITIDAS.includes(chave),
      `realm não pode ter a chave desconhecida "${chave}" (inclui defaultDefaultClientScopes/defaultOptionalClientScopes, ignoradas pelo import do Keycloak)`,
    );
  }

  exigir(realm.registrationAllowed === false, 'registrationAllowed deve ser false');
  exigir(realm.resetPasswordAllowed === true, 'resetPasswordAllowed deve ser true');
  exigir(realm.loginWithEmailAllowed === true, 'loginWithEmailAllowed deve ser true');
  exigir(realm.duplicateEmailsAllowed === false, 'duplicateEmailsAllowed deve ser false');
  exigir(realm.editUsernameAllowed === false, 'editUsernameAllowed deve ser false');

  exigir(realm.bruteForceProtected === true, 'bruteForceProtected deve ser true (boolean)');
  exigir(realm.permanentLockout === false, 'permanentLockout deve ser false (boolean), nunca travar a conta para sempre');
  exigir(realm.failureFactor === 5, 'failureFactor deve ser 5 (number)');
  exigir(
    typeof realm.waitIncrementSeconds === 'number' && realm.waitIncrementSeconds > 0,
    'waitIncrementSeconds precisa ser number > 0 (espera crescente)',
  );
  exigir(realm.maxFailureWaitSeconds === 900, 'maxFailureWaitSeconds deve ser 900 (number, 15 min)');

  const politicaDeSenha = realm.passwordPolicy ?? '';
  exigir(politicaDeSenha.includes('length(10)'), 'passwordPolicy precisa de length(10)');
  exigir(politicaDeSenha.includes('digits(1)'), 'passwordPolicy precisa de digits(1)');
  exigir(politicaDeSenha.includes('notEmail'), 'passwordPolicy precisa de notEmail');
  exigir(politicaDeSenha.includes('notUsername'), 'passwordPolicy precisa de notUsername');

  const exigenciaDeLetra = politicaDeSenha.match(/(?:lowerCase|upperCase)\((\d+)\)/);
  exigir(
    exigenciaDeLetra !== null && Number(exigenciaDeLetra[1]) >= 1,
    'passwordPolicy precisa de lowerCase(n) ou upperCase(n) com n >= 1',
  );

  exigir(realm.accessTokenLifespan === 300, 'accessTokenLifespan deve ser 300 (number)');
  exigir(realm.ssoSessionIdleTimeout === 1800, 'ssoSessionIdleTimeout deve ser 1800 (number)');
  exigir(realm.ssoSessionMaxLifespan === 28800, 'ssoSessionMaxLifespan deve ser 28800 (number)');
  exigir(realm.revokeRefreshToken === true, 'revokeRefreshToken deve ser true (boolean)');
  exigir(realm.refreshTokenMaxReuse === 0, 'refreshTokenMaxReuse deve ser 0 (number)');
  exigir(realm.rememberMe === false, 'rememberMe deve ser false (boolean), nunca estender sessão além do SSO');

  exigir(
    realm.offlineSessionMaxLifespanEnabled === true,
    'offlineSessionMaxLifespanEnabled deve ser true (boolean) — token offline não pode viver para sempre',
  );
  exigir(
    typeof realm.offlineSessionMaxLifespan === 'number' &&
      realm.offlineSessionMaxLifespan > 0 &&
      realm.offlineSessionMaxLifespan <= 28800,
    'offlineSessionMaxLifespan deve ser number > 0 e <= 28800 (não pode ultrapassar ssoSessionMaxLifespan)',
  );

  exigir(realm.internationalizationEnabled === true, 'internationalizationEnabled deve ser true (boolean)');
  exigir(realm.defaultLocale === 'pt-BR', 'defaultLocale deve ser pt-BR');
  exigir(
    Array.isArray(realm.supportedLocales) && realm.supportedLocales.includes('pt-BR'),
    'supportedLocales precisa incluir pt-BR',
  );

  exigir(realm.smtpServer?.host === 'mailpit', 'smtpServer.host deve ser mailpit');
  exigir(String(realm.smtpServer?.port) === '1025', 'smtpServer.port deve ser 1025');
  exigir(
    realm.smtpServer?.from === 'noreply@cdd.local',
    'smtpServer.from deve ser noreply@cdd.local',
  );

  exigir(realm.loginTheme !== 'cdd', 'loginTheme "cdd" ainda não existe (entra na peça I09)');
  if (realm.loginTheme) {
    const caminhoDoTema = join(caminhoDosTemas, realm.loginTheme, 'login');
    exigir(
      existsSync(caminhoDoTema),
      `loginTheme "${realm.loginTheme}" não existe em infra/keycloak/themes`,
    );
  }

  verificarConjuntoFechadoDeClientsEUsuarios(realm);
  verificarAusenciaDeGruposEPapeisSoltos(realm);
  verificarCredenciaisDeTodosOsUsuarios(realm);

  for (const client of realm.clients ?? []) {
    verificarClienteFechado(client);
  }
}

function verificarCddWeb(realm) {
  const cddWeb = encontrarClient(realm, 'cdd-web');
  exigir(!!cddWeb, 'client cdd-web não encontrado');
  if (!cddWeb) return;

  exigir(cddWeb.enabled === true, 'cdd-web precisa de enabled=true');
  exigir(cddWeb.protocol === 'openid-connect', 'cdd-web.protocol deve ser openid-connect');
  exigir(cddWeb.publicClient === true, 'cdd-web deve ser publicClient');
  exigir(cddWeb.standardFlowEnabled === true, 'cdd-web precisa de standardFlowEnabled');
  exigir(
    cddWeb.directAccessGrantsEnabled === false,
    'cdd-web não pode ter directAccessGrantsEnabled ligado',
  );
  exigir(cddWeb.implicitFlowEnabled === false, 'cdd-web não pode ter implicitFlowEnabled ligado');
  exigir(cddWeb.serviceAccountsEnabled === false, 'cdd-web não pode ter serviceAccountsEnabled');
  exigirObjetoFechado(
    cddWeb.attributes,
    {
      'pkce.code.challenge.method': 'S256',
      'post.logout.redirect.uris': 'http://localhost:5173/*',
    },
    'cdd-web.attributes',
  );

  exigirArrayFechado(cddWeb.redirectUris, ['http://localhost:5173/*'], 'cdd-web.redirectUris');
  exigirArrayFechado(cddWeb.webOrigins, ['http://localhost:5173'], 'cdd-web.webOrigins');
}

function verificarCddApiAdmin(realm) {
  const cddApiAdmin = encontrarClient(realm, 'cdd-api-admin');
  exigir(!!cddApiAdmin, 'client cdd-api-admin não encontrado');
  if (!cddApiAdmin) return;

  exigir(cddApiAdmin.enabled === true, 'cdd-api-admin precisa de enabled=true');
  exigir(cddApiAdmin.protocol === 'openid-connect', 'cdd-api-admin.protocol deve ser openid-connect');
  exigir(cddApiAdmin.publicClient === false, 'cdd-api-admin deve ser confidencial');
  exigir(
    cddApiAdmin.clientAuthenticatorType === 'client-secret',
    'cdd-api-admin.clientAuthenticatorType deve ser client-secret',
  );
  exigir(
    cddApiAdmin.serviceAccountsEnabled === true,
    'cdd-api-admin precisa de serviceAccountsEnabled',
  );
  exigir(
    cddApiAdmin.standardFlowEnabled === false,
    'cdd-api-admin não pode ter standardFlowEnabled',
  );
  exigir(
    cddApiAdmin.directAccessGrantsEnabled === false,
    'cdd-api-admin não pode ter directAccessGrantsEnabled',
  );
  exigir(
    cddApiAdmin.implicitFlowEnabled === false,
    'cdd-api-admin não pode ter implicitFlowEnabled',
  );
  exigir(
    ehPlaceholderDeAmbiente(cddApiAdmin.secret),
    'cdd-api-admin.secret precisa ser um placeholder de variável de ambiente, nunca um segredo em claro',
  );

  const contaDeServico = encontrarUsuario(realm, 'service-account-cdd-api-admin');
  exigir(!!contaDeServico, 'usuário de conta de serviço do cdd-api-admin não encontrado');
  if (!contaDeServico) return;

  verificarPapeisDeContaDeServico(contaDeServico, { 'realm-management': ['manage-users'] });
}

function verificarCddTeste(realm) {
  const cddTeste = encontrarClient(realm, 'cdd-teste');
  exigir(!!cddTeste, 'client cdd-teste não encontrado');
  if (!cddTeste) return;

  exigir(cddTeste.enabled === true, 'cdd-teste precisa de enabled=true');
  exigir(cddTeste.protocol === 'openid-connect', 'cdd-teste.protocol deve ser openid-connect');
  exigir(cddTeste.publicClient === true, 'cdd-teste deve ser publicClient');
  exigir(
    cddTeste.directAccessGrantsEnabled === true,
    'cdd-teste precisa de directAccessGrantsEnabled',
  );
  exigir(cddTeste.standardFlowEnabled === false, 'cdd-teste não pode ter standardFlowEnabled');
  exigir(cddTeste.implicitFlowEnabled === false, 'cdd-teste não pode ter implicitFlowEnabled ligado');
  exigir(cddTeste.serviceAccountsEnabled === false, 'cdd-teste não pode ter serviceAccountsEnabled');

  exigir(Array.isArray(cddTeste.redirectUris), 'cdd-teste.redirectUris precisa ser um array');
  const redirectUrisDoTeste = cddTeste.redirectUris ?? [];
  exigir(
    redirectUrisDoTeste.every((uri) => uri !== '*' && uri.startsWith('http://localhost')),
    'cdd-teste.redirectUris não pode ter curinga solto nem sair de localhost',
  );

  exigir(
    /desenvolvimento|local/i.test(cddTeste.description ?? ''),
    'cdd-teste precisa descrever no realm que é só de desenvolvimento',
  );
}

function verificarAdminCli(realm) {
  const adminCli = encontrarClient(realm, 'admin-cli');
  exigir(!!adminCli, 'client admin-cli não encontrado — precisa ser declarado por completo, sem offline_access');
  if (!adminCli) return;

  const camposEscalaresEsperados = {
    clientId: 'admin-cli',
    name: '${client_admin-cli}',
    surrogateAuthRequired: false,
    enabled: true,
    alwaysDisplayInConsole: false,
    clientAuthenticatorType: 'client-secret',
    notBefore: 0,
    bearerOnly: false,
    consentRequired: false,
    standardFlowEnabled: false,
    implicitFlowEnabled: false,
    directAccessGrantsEnabled: true,
    serviceAccountsEnabled: false,
    publicClient: true,
    frontchannelLogout: false,
    protocol: 'openid-connect',
    fullScopeAllowed: true,
    nodeReRegistrationTimeout: 0,
  };
  for (const [chave, valorEsperado] of Object.entries(camposEscalaresEsperados)) {
    exigir(
      adminCli[chave] === valorEsperado,
      `admin-cli["${chave}"] precisa ser exatamente ${JSON.stringify(valorEsperado)}, encontrado ${JSON.stringify(adminCli[chave])}`,
    );
  }

  exigirArrayFechado(adminCli.redirectUris, [], 'admin-cli.redirectUris');
  exigirArrayFechado(adminCli.webOrigins, [], 'admin-cli.webOrigins');
  exigirObjetoFechado(adminCli.authenticationFlowBindingOverrides, {}, 'admin-cli.authenticationFlowBindingOverrides');
  exigirObjetoFechado(
    adminCli.attributes,
    {
      realm_client: 'false',
      'client.use.lightweight.access.token.enabled': 'true',
    },
    'admin-cli.attributes',
  );

  exigir(
    !(adminCli.optionalClientScopes ?? []).includes('offline_access'),
    'admin-cli não pode ter offline_access como escopo opcional (sessão offline sem limite de escopo de negócio)',
  );
}

function verificarUsuarioDev(realm) {
  const usuarioDev = encontrarUsuario(realm, 'dev@cdd.local');
  exigir(!!usuarioDev, 'usuário dev@cdd.local não encontrado');
  if (!usuarioDev) return;

  exigir(usuarioDev.emailVerified === true, 'dev@cdd.local precisa de emailVerified');
  exigir(!(usuarioDev.groups ?? []).length, 'dev@cdd.local não pode pertencer a grupo');
  exigir(!(usuarioDev.realmRoles ?? []).length, 'dev@cdd.local não pode ter papel de negócio');
  exigir(
    Object.keys(usuarioDev.clientRoles ?? {}).length === 0,
    'dev@cdd.local não pode ter clientRoles (nem realm-management)',
  );

  const credencial = (usuarioDev.credentials ?? [])[0];
  exigir(
    ehPlaceholderDeAmbiente(credencial?.value),
    'dev@cdd.local precisa de senha vinda de placeholder de variável de ambiente',
  );
}

const realm = JSON.parse(readFileSync(caminhoDoRealm, 'utf8'));

verificarRealm(realm);
verificarCddWeb(realm);
verificarCddApiAdmin(realm);
verificarCddTeste(realm);
verificarAdminCli(realm);
verificarUsuarioDev(realm);

if (falhas.length > 0) {
  console.error(`verificar-realm: ${falhas.length} regra(s) do realm cdd regrediram`);
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exit(1);
}

console.log('verificar-realm: todas as regras do realm cdd continuam OK');
