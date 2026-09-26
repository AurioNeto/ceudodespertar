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

function encontrarClient(realm, clientId) {
  return (realm.clients ?? []).find((cliente) => cliente.clientId === clientId);
}

function encontrarUsuario(realm, username) {
  return (realm.users ?? []).find((usuario) => usuario.username === username);
}

function contemMapeadorDeAudiencia(client, audienciaEsperada) {
  return (client?.protocolMappers ?? []).some(
    (mapeador) =>
      mapeador.protocolMapper === 'oidc-audience-mapper' &&
      mapeador.config?.['included.client.audience'] === audienciaEsperada &&
      mapeador.config?.['access.token.claim'] === 'true',
  );
}

const ATRIBUTOS_DE_SESSAO_PROIBIDOS_POR_CLIENTE = {
  'access.token.lifespan': 300,
  'client.session.idle.timeout': 1800,
  'client.session.max.lifespan': 28800,
  'client.offline.session.idle.timeout': 1800,
  'client.offline.session.max.lifespan': 28800,
};

function verificarAtributosDeSessaoDoCliente(client) {
  const atributos = client?.attributes ?? {};
  for (const [chave, limite] of Object.entries(ATRIBUTOS_DE_SESSAO_PROIBIDOS_POR_CLIENTE)) {
    const valor = atributos[chave];
    if (valor === undefined) continue;
    exigir(
      Number(valor) > 0 && Number(valor) <= limite,
      `${client.clientId}.attributes["${chave}"] não pode passar de ${limite} segundos`,
    );
  }
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

function verificarRealm(realm) {
  exigir(realm.registrationAllowed === false, 'registrationAllowed deve ser false');
  exigir(realm.resetPasswordAllowed === true, 'resetPasswordAllowed deve ser true');
  exigir(realm.loginWithEmailAllowed === true, 'loginWithEmailAllowed deve ser true');
  exigir(realm.duplicateEmailsAllowed === false, 'duplicateEmailsAllowed deve ser false');
  exigir(realm.editUsernameAllowed === false, 'editUsernameAllowed deve ser false');

  exigir(realm.bruteForceProtected === true, 'bruteForceProtected deve ser true');
  exigir(realm.permanentLockout !== true, 'permanentLockout não pode travar a conta para sempre');
  exigir(realm.failureFactor === 5, 'failureFactor deve ser 5');
  exigir(
    typeof realm.waitIncrementSeconds === 'number' && realm.waitIncrementSeconds > 0,
    'waitIncrementSeconds precisa ser > 0 (espera crescente)',
  );
  exigir(realm.maxFailureWaitSeconds === 900, 'maxFailureWaitSeconds deve ser 900 (15 min)');

  const politicaDeSenha = realm.passwordPolicy ?? '';
  exigir(politicaDeSenha.includes('length(10)'), 'passwordPolicy precisa de length(10)');
  exigir(politicaDeSenha.includes('digits(1)'), 'passwordPolicy precisa de digits(1)');
  exigir(politicaDeSenha.includes('notEmail'), 'passwordPolicy precisa de notEmail');
  exigir(politicaDeSenha.includes('notUsername'), 'passwordPolicy precisa de notUsername');
  exigir(
    /lowerCase\(|upperCase\(|regexPattern\(/.test(politicaDeSenha),
    'passwordPolicy precisa de exigência de letra (lowerCase/upperCase/regexPattern)',
  );

  exigir(realm.accessTokenLifespan === 300, 'accessTokenLifespan deve ser 300');
  exigir(realm.ssoSessionIdleTimeout === 1800, 'ssoSessionIdleTimeout deve ser 1800');
  exigir(realm.ssoSessionMaxLifespan === 28800, 'ssoSessionMaxLifespan deve ser 28800');
  exigir(realm.revokeRefreshToken === true, 'revokeRefreshToken deve ser true');
  exigir(realm.refreshTokenMaxReuse === 0, 'refreshTokenMaxReuse deve ser 0');
  exigir(realm.rememberMe !== true, 'rememberMe não pode estender sessão além do SSO');

  exigir(
    realm.offlineSessionMaxLifespanEnabled === true,
    'offlineSessionMaxLifespanEnabled deve ser true (token offline não pode viver para sempre)',
  );
  exigir(
    typeof realm.offlineSessionMaxLifespan === 'number' &&
      realm.offlineSessionMaxLifespan > 0 &&
      realm.offlineSessionMaxLifespan <= 28800,
    'offlineSessionMaxLifespan deve ser > 0 e <= 28800 (não pode ultrapassar ssoSessionMaxLifespan)',
  );

  const escoposOpcionaisPadrao = realm.defaultOptionalClientScopes ?? [];
  exigir(
    !escoposOpcionaisPadrao.includes('offline_access'),
    'defaultOptionalClientScopes não pode incluir offline_access (sessão sobreviveria ao logout do SSO)',
  );

  exigir(realm.internationalizationEnabled === true, 'internationalizationEnabled deve ser true');
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
}

function verificarCddWeb(realm) {
  const cddWeb = encontrarClient(realm, 'cdd-web');
  exigir(!!cddWeb, 'client cdd-web não encontrado');
  if (!cddWeb) return;

  exigir(cddWeb.publicClient === true, 'cdd-web deve ser publicClient');
  exigir(cddWeb.standardFlowEnabled === true, 'cdd-web precisa de standardFlowEnabled');
  exigir(
    cddWeb.directAccessGrantsEnabled === false,
    'cdd-web não pode ter directAccessGrantsEnabled ligado',
  );
  exigir(cddWeb.implicitFlowEnabled === false, 'cdd-web não pode ter implicitFlowEnabled ligado');
  exigir(cddWeb.serviceAccountsEnabled === false, 'cdd-web não pode ter serviceAccountsEnabled');
  exigir(
    cddWeb.attributes?.['pkce.code.challenge.method'] === 'S256',
    'cdd-web precisa de PKCE com S256',
  );

  const redirectUris = cddWeb.redirectUris ?? [];
  exigir(
    redirectUris.length === 1 && redirectUris[0] === 'http://localhost:5173/*',
    'cdd-web.redirectUris deve ser exatamente ["http://localhost:5173/*"]',
  );
  exigir(
    redirectUris.every((uri) => uri !== '*' && uri.startsWith('http://localhost:5173')),
    'cdd-web.redirectUris não pode ter curinga solto nem sair de localhost:5173',
  );

  const webOrigins = cddWeb.webOrigins ?? [];
  exigir(
    webOrigins.length === 1 && webOrigins[0] === 'http://localhost:5173',
    'cdd-web.webOrigins deve ser exatamente ["http://localhost:5173"]',
  );

  exigir(
    cddWeb.attributes?.['post.logout.redirect.uris'] === 'http://localhost:5173/*',
    'cdd-web precisa de post.logout.redirect.uris',
  );

  exigir(
    contemMapeadorDeAudiencia(cddWeb, 'cdd-api'),
    'cdd-web precisa do audience cdd-api no access token',
  );

  exigir(
    !(cddWeb.optionalClientScopes ?? []).includes('offline_access'),
    'cdd-web não pode ter offline_access como escopo opcional',
  );
  exigir(
    !(cddWeb.defaultClientScopes ?? []).includes('offline_access'),
    'cdd-web não pode ter offline_access como escopo padrão',
  );

  verificarAtributosDeSessaoDoCliente(cddWeb);
}

function verificarCddApiAdmin(realm) {
  const cddApiAdmin = encontrarClient(realm, 'cdd-api-admin');
  exigir(!!cddApiAdmin, 'client cdd-api-admin não encontrado');
  if (!cddApiAdmin) return;

  exigir(cddApiAdmin.publicClient === false, 'cdd-api-admin deve ser confidencial');
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

  verificarAtributosDeSessaoDoCliente(cddApiAdmin);
}

function verificarCddTeste(realm) {
  const cddTeste = encontrarClient(realm, 'cdd-teste');
  exigir(!!cddTeste, 'client cdd-teste não encontrado');
  if (!cddTeste) return;

  exigir(cddTeste.publicClient === true, 'cdd-teste deve ser publicClient');
  exigir(
    cddTeste.directAccessGrantsEnabled === true,
    'cdd-teste precisa de directAccessGrantsEnabled',
  );
  exigir(cddTeste.standardFlowEnabled === false, 'cdd-teste não pode ter standardFlowEnabled');
  exigir(cddTeste.implicitFlowEnabled === false, 'cdd-teste não pode ter implicitFlowEnabled ligado');
  exigir(cddTeste.serviceAccountsEnabled === false, 'cdd-teste não pode ter serviceAccountsEnabled');

  const redirectUrisDoTeste = cddTeste.redirectUris ?? [];
  exigir(
    redirectUrisDoTeste.every((uri) => uri !== '*' && uri.startsWith('http://localhost')),
    'cdd-teste.redirectUris não pode ter curinga solto nem sair de localhost',
  );

  exigir(
    contemMapeadorDeAudiencia(cddTeste, 'cdd-api'),
    'cdd-teste precisa do audience cdd-api no access token',
  );
  exigir(
    !(cddTeste.optionalClientScopes ?? []).includes('offline_access'),
    'cdd-teste não pode ter offline_access como escopo opcional',
  );
  exigir(
    !(cddTeste.defaultClientScopes ?? []).includes('offline_access'),
    'cdd-teste não pode ter offline_access como escopo padrão',
  );
  exigir(
    /desenvolvimento|local/i.test(cddTeste.description ?? ''),
    'cdd-teste precisa descrever no realm que é só de desenvolvimento',
  );

  verificarAtributosDeSessaoDoCliente(cddTeste);
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
verificarUsuarioDev(realm);

if (falhas.length > 0) {
  console.error(`verificar-realm: ${falhas.length} regra(s) do realm cdd regrediram`);
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exit(1);
}

console.log('verificar-realm: todas as regras do realm cdd continuam OK');
