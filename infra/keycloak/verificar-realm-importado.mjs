import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATRIBUTOS_VIVOS_POR_CLIENTE,
  CLIENTES_EMBUTIDOS_E_ADMIN_CLI,
  CLIENTES_SEM_OVERRIDE_DE_FLUXO_DECLARADO,
  COMPOSITES_ESPERADOS_DE_DEFAULT_ROLES,
  ESCOPOS_ATRIBUIDOS_POR_CLIENTE,
  ESCOPOS_PADRAO_DO_REALM,
  FLUXOS_VIVOS_ESPERADOS,
  MAPEADORES_POR_ESCOPO_PADRAO,
  MODELO_CLIENTES,
  MODELO_REALM_VIVO,
  MODELO_USUARIOS,
  PAPEIS_EFETIVOS_ESPERADOS,
  PROTOCOL_MAPPERS_VIVOS_POR_CLIENTE,
  REQUIRED_ACTIONS_ESPERADAS,
  SCOPE_MAPPINGS_DE_REALM_MANAGEMENT_ESPERADOS,
  compararComEspecificacao,
  conjunto,
  extrairCampos,
  normalizarBooleanoTexto,
  objeto,
  objetoComApenas,
} from './modelo-esperado.mjs';

const TEMPO_LIMITE_MS = 20000;
const NOME_DO_REALM = 'cdd';

const diretorioDoScript = dirname(fileURLToPath(import.meta.url));
const raizDoRepositorio = join(diretorioDoScript, '..', '..');

function carregarVariaveisResolvidasDoCompose() {
  let saida;
  try {
    saida = execFileSync('docker', ['compose', 'config', '--format', 'json'], {
      cwd: raizDoRepositorio,
      encoding: 'utf8',
      timeout: TEMPO_LIMITE_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }
  let configuracao;
  try {
    configuracao = JSON.parse(saida);
  } catch {
    return;
  }
  const ambienteDoKeycloak = configuracao.services?.keycloak?.environment ?? {};
  for (const [chave, valorResolvido] of Object.entries(ambienteDoKeycloak)) {
    if (process.env[chave] === undefined && valorResolvido !== undefined && valorResolvido !== null) {
      process.env[chave] = String(valorResolvido);
    }
  }
  if (process.env.KEYCLOAK_ADMIN_SENHA === undefined && process.env.KC_BOOTSTRAP_ADMIN_PASSWORD !== undefined) {
    process.env.KEYCLOAK_ADMIN_SENHA = process.env.KC_BOOTSTRAP_ADMIN_PASSWORD;
  }
}

carregarVariaveisResolvidasDoCompose();

function exigirVariavel(nomeDaVariavel) {
  const valorAtual = process.env[nomeDaVariavel];
  if (!valorAtual) {
    console.error(`verificar-realm-importado: defina ${nomeDaVariavel} (no .env) antes de rodar`);
    process.exit(1);
  }
  return valorAtual;
}

const senhaDoAdmin = exigirVariavel('KEYCLOAK_ADMIN_SENHA');
const segredoDoCddApiAdmin = exigirVariavel('CDD_KC_ADMIN_SEGREDO');

const emissorPadrao = process.env.OIDC_EMISSOR ?? 'http://localhost:8080/realms/cdd';
const urlBase = emissorPadrao.replace(/\/realms\/.*$/, '');

async function buscar(caminho, opcoes = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
  try {
    return await fetch(`${urlBase}${caminho}`, { ...opcoes, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

async function obterTokenDeAdmin() {
  let resposta;
  try {
    resposta = await buscar('/realms/master/protocol/openid-connect/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: 'admin',
        password: senhaDoAdmin,
      }),
    });
  } catch (erro) {
    console.error(`verificar-realm-importado: não conseguiu contatar ${urlBase} para obter o token de admin (${erro.message})`);
    process.exit(1);
  }
  if (!resposta.ok) {
    console.error(`verificar-realm-importado: token de admin recusado (HTTP ${resposta.status}); confira KEYCLOAK_ADMIN_SENHA`);
    process.exit(1);
  }
  const corpo = await resposta.json();
  return corpo.access_token;
}

async function chamarAdminApi(token, caminho) {
  let resposta;
  try {
    resposta = await buscar(`/admin/realms/${NOME_DO_REALM}${caminho}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (erro) {
    throw new Error(`não conseguiu contatar ${caminho} (${erro.message})`);
  }
  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new Error(`${caminho} respondeu HTTP ${resposta.status}: ${await resposta.text()}`);
  }
  return resposta.json();
}

function sugerirZerarNaFalha(falhas) {
  if (falhas.length === 0) return;
  falhas.push(
    'estado importado diverge do modelo — se o Keycloak reaproveitou um realm antigo (log "Realm \'cdd\' already exists. Import skipped"), rode "pnpm infra:zerar" e suba de novo',
  );
}

const falhas = [];
const token = await obterTokenDeAdmin();

const realm = await chamarAdminApi(token, '');
if (realm === null) {
  console.error(`verificar-realm-importado: realm "${NOME_DO_REALM}" não existe no Keycloak importado`);
  console.error('  - rode "pnpm infra:zerar" e suba de novo');
  process.exit(1);
}

const camposDoRealmVivo = Object.keys(MODELO_REALM_VIVO.obrigatorias);
compararComEspecificacao(extrairCampos(realm, camposDoRealmVivo), MODELO_REALM_VIVO, 'realm', falhas);

const identityProviders = (await chamarAdminApi(token, '/identity-provider/instances')) ?? [];
if (identityProviders.length > 0) {
  falhas.push(`realm.identity-providers precisa estar vazio, encontrado ${JSON.stringify(identityProviders.map((idp) => idp.alias))}`);
}

const componentesDeFederacao =
  (await chamarAdminApi(token, '/components?type=org.keycloak.storage.UserStorageProvider')) ?? [];
if (componentesDeFederacao.length > 0) {
  falhas.push(
    `realm.user-federation precisa estar vazio, encontrado ${JSON.stringify(componentesDeFederacao.map((componente) => componente.name))}`,
  );
}

const escoposPadraoDefault = (await chamarAdminApi(token, '/default-default-client-scopes')) ?? [];
compararComEspecificacao(
  escoposPadraoDefault.map((escopo) => escopo.name),
  ESCOPOS_PADRAO_DO_REALM.defaultDefaultClientScopes,
  'realm.default-default-client-scopes',
  falhas,
);

const escoposPadraoOpcionais = (await chamarAdminApi(token, '/default-optional-client-scopes')) ?? [];
compararComEspecificacao(
  escoposPadraoOpcionais.map((escopo) => escopo.name),
  ESCOPOS_PADRAO_DO_REALM.defaultOptionalClientScopes,
  'realm.default-optional-client-scopes',
  falhas,
);

for (const [alias, especificacaoDeExecucoes] of Object.entries(FLUXOS_VIVOS_ESPERADOS)) {
  const execucoes = (await chamarAdminApi(token, `/authentication/flows/${encodeURIComponent(alias)}/executions`)) ?? [];
  compararComEspecificacao(execucoes, especificacaoDeExecucoes, `realm.fluxos[${alias}]`, falhas);
}

const acoesObrigatoriasVivas = (await chamarAdminApi(token, '/authentication/required-actions')) ?? [];
const acoesObrigatoriasProjetadas = acoesObrigatoriasVivas.map((acao) => extrairCampos(acao, ['alias', 'enabled', 'defaultAction']));
compararComEspecificacao(acoesObrigatoriasProjetadas, REQUIRED_ACTIONS_ESPERADAS, 'realm.required-actions', falhas);

const todosOsClientes = (await chamarAdminApi(token, '/clients?max=1000')) ?? [];

function encontrarCliente(clientId) {
  return todosOsClientes.find((cliente) => cliente.clientId === clientId);
}

const clientIdsEsperados = new Set([...Object.keys(MODELO_CLIENTES), ...Object.keys(CLIENTES_EMBUTIDOS_E_ADMIN_CLI)]);
const clientIdsVivos = new Set(todosOsClientes.map((cliente) => cliente.clientId));
compararComEspecificacao([...clientIdsVivos], conjunto([...clientIdsEsperados]), 'realm.clients[].clientId', falhas);

for (const clientId of Object.keys(MODELO_CLIENTES)) {
  const clienteVivo = encontrarCliente(clientId);
  const caminho = `clientes[${clientId}]`;
  if (!clienteVivo) {
    falhas.push(`${caminho} não foi encontrado no realm importado`);
    continue;
  }

  const modeloDoCliente = MODELO_CLIENTES[clientId];
  const chavesEscalares = [
    ...Object.keys(modeloDoCliente.obrigatorias),
    ...Object.keys(modeloDoCliente.opcionais ?? {}),
  ].filter((chave) => !['attributes', 'protocolMappers', 'secret'].includes(chave));
  compararComEspecificacao(
    extrairCampos(clienteVivo, chavesEscalares),
    objetoComApenas(modeloDoCliente, chavesEscalares),
    caminho,
    falhas,
  );

  const atributosEsperados = ATRIBUTOS_VIVOS_POR_CLIENTE[clientId];
  if (atributosEsperados) {
    compararComEspecificacao(clienteVivo.attributes ?? {}, atributosEsperados, `${caminho}.attributes`, falhas);
  }

  const mapeadoresEsperados = PROTOCOL_MAPPERS_VIVOS_POR_CLIENTE[clientId];
  if (mapeadoresEsperados) {
    const mapeadoresSemId = (clienteVivo.protocolMappers ?? []).map(({ id, ...resto }) => resto);
    compararComEspecificacao(mapeadoresSemId, mapeadoresEsperados, `${caminho}.protocolMappers`, falhas);
  }

  if (clientId === 'cdd-api-admin') {
    if (clienteVivo.secret !== segredoDoCddApiAdmin) {
      falhas.push(
        `${caminho}.secret precisa ser igual a CDD_KC_ADMIN_SEGREDO do ambiente, encontrado um valor diferente (o Keycloak não resolveu o placeholder, ou o segredo foi trocado por fora)`,
      );
    }
  }
}

for (const clientId of CLIENTES_SEM_OVERRIDE_DE_FLUXO_DECLARADO) {
  const clienteVivo = encontrarCliente(clientId);
  if (!clienteVivo) continue;
  const overrides = clienteVivo.authenticationFlowBindingOverrides ?? {};
  if (Object.keys(overrides).length > 0) {
    falhas.push(`clientes[${clientId}].authenticationFlowBindingOverrides precisa estar vazio, encontrado ${JSON.stringify(overrides)}`);
  }
}

for (const [clientId, especificacaoDeMapeadores] of Object.entries(PROTOCOL_MAPPERS_VIVOS_POR_CLIENTE)) {
  if (MODELO_CLIENTES[clientId]) continue;
  const clienteVivo = encontrarCliente(clientId);
  if (!clienteVivo) continue;
  const mapeadoresSemId = (clienteVivo.protocolMappers ?? []).map(({ id, ...resto }) => resto);
  compararComEspecificacao(mapeadoresSemId, especificacaoDeMapeadores, `clientesEmbutidos[${clientId}].protocolMappers`, falhas);
}

const escoposConsultados = new Map();

async function obterMapeadoresDoEscopo(escopoId, nomeDoEscopo) {
  if (escoposConsultados.has(nomeDoEscopo)) return escoposConsultados.get(nomeDoEscopo);
  const detalhe = await chamarAdminApi(token, `/client-scopes/${escopoId}`);
  const mapeadores = (detalhe?.protocolMappers ?? []).map(({ id, ...resto }) => resto);
  escoposConsultados.set(nomeDoEscopo, mapeadores);
  return mapeadores;
}

for (const [clientId, escopos] of Object.entries(ESCOPOS_ATRIBUIDOS_POR_CLIENTE)) {
  const clienteVivo = encontrarCliente(clientId);
  if (!clienteVivo) continue;
  const caminho = `clientes[${clientId}].escopos`;

  const escoposPadraoVivos = (await chamarAdminApi(token, `/clients/${clienteVivo.id}/default-client-scopes`)) ?? [];
  compararComEspecificacao(
    escoposPadraoVivos.map((escopo) => escopo.name),
    conjunto(escopos.padrao),
    `${caminho}.padrao`,
    falhas,
  );

  const escoposOpcionaisVivos = (await chamarAdminApi(token, `/clients/${clienteVivo.id}/optional-client-scopes`)) ?? [];
  compararComEspecificacao(
    escoposOpcionaisVivos.map((escopo) => escopo.name),
    conjunto(escopos.opcionais),
    `${caminho}.opcionais`,
    falhas,
  );

  for (const escopoVivo of [...escoposPadraoVivos, ...escoposOpcionaisVivos]) {
    const especificacaoEsperada = MAPEADORES_POR_ESCOPO_PADRAO[escopoVivo.name];
    if (!especificacaoEsperada) continue;
    const mapeadoresVivos = await obterMapeadoresDoEscopo(escopoVivo.id, escopoVivo.name);
    compararComEspecificacao(mapeadoresVivos, especificacaoEsperada, `escopos[${escopoVivo.name}].protocolMappers`, falhas);
  }
}

function ehUsuarioDeContaDeServico(nomeDeUsuario) {
  return 'serviceAccountClientId' in MODELO_USUARIOS[nomeDeUsuario].obrigatorias;
}

const usernamesRegularesEsperados = Object.keys(MODELO_USUARIOS).filter((nome) => !ehUsuarioDeContaDeServico(nome));
const usernamesDeContaDeServicoEsperados = Object.keys(MODELO_USUARIOS).filter(ehUsuarioDeContaDeServico);

const usuariosRegularesVivos = (await chamarAdminApi(token, '/users?max=1000')) ?? [];
compararComEspecificacao(
  usuariosRegularesVivos.map((usuario) => usuario.username),
  conjunto(usernamesRegularesEsperados),
  'realm.users[].username (excluindo contas de serviço, que o Keycloak esconde dessa listagem)',
  falhas,
);

async function obterIdDoUsuario(nomeDeUsuario) {
  const usuarios = (await chamarAdminApi(token, `/users?username=${encodeURIComponent(nomeDeUsuario)}&exact=true`)) ?? [];
  return usuarios[0]?.id ?? null;
}

for (const nomeDeUsuario of usernamesDeContaDeServicoEsperados) {
  const encontrado = await obterIdDoUsuario(nomeDeUsuario);
  if (!encontrado) {
    falhas.push(`realm.users[] não encontrou o usuário de conta de serviço "${nomeDeUsuario}"`);
  }
}

async function obterPapeisRealmCompostos(usuarioId) {
  const papeis = (await chamarAdminApi(token, `/users/${usuarioId}/role-mappings/realm/composite`)) ?? [];
  return papeis.map((papel) => papel.name);
}

async function obterPapeisDeClientesCompostos(usuarioId) {
  const porCliente = {};
  for (const cliente of todosOsClientes) {
    const papeis =
      (await chamarAdminApi(token, `/users/${usuarioId}/role-mappings/clients/${cliente.id}/composite`)) ?? [];
    if (papeis.length > 0) {
      porCliente[cliente.clientId] = papeis.map((papel) => papel.name);
    }
  }
  return porCliente;
}

for (const [nomeDeUsuario, esperado] of Object.entries(PAPEIS_EFETIVOS_ESPERADOS)) {
  const caminho = `papeis[${nomeDeUsuario}]`;
  const usuarioId = await obterIdDoUsuario(nomeDeUsuario);
  if (!usuarioId) {
    falhas.push(`${caminho} não encontrou o usuário "${nomeDeUsuario}" no realm importado`);
    continue;
  }

  const papeisDeRealmVivos = await obterPapeisRealmCompostos(usuarioId);
  compararComEspecificacao(papeisDeRealmVivos, conjunto(esperado.realm), `${caminho}.realm`, falhas);

  const papeisDeClientesVivos = await obterPapeisDeClientesCompostos(usuarioId);
  const especificacaoDeClientes = objeto({
    obrigatorias: Object.fromEntries(
      Object.entries(esperado.clientes).map(([clientId, papeisEsperados]) => [clientId, conjunto(papeisEsperados)]),
    ),
  });
  compararComEspecificacao(papeisDeClientesVivos, especificacaoDeClientes, `${caminho}.clientes`, falhas);
}

const compositesDeDefaultRoles = (await chamarAdminApi(token, '/roles/default-roles-cdd/composites')) ?? [];
const compositesDeRealm = compositesDeDefaultRoles.filter((composite) => !composite.clientRole).map((composite) => composite.name);
compararComEspecificacao(
  compositesDeRealm,
  conjunto(COMPOSITES_ESPERADOS_DE_DEFAULT_ROLES.realm),
  'realm.default-roles-cdd.composites.realm',
  falhas,
);

const compositesDeClientesPorNome = {};
for (const composite of compositesDeDefaultRoles.filter((item) => item.clientRole)) {
  const clienteContainer = todosOsClientes.find((cliente) => cliente.id === composite.containerId);
  const nomeDoCliente = clienteContainer?.clientId ?? composite.containerId;
  (compositesDeClientesPorNome[nomeDoCliente] ??= []).push(composite.name);
}
const especificacaoDeCompositesDeClientes = objeto({
  obrigatorias: Object.fromEntries(
    Object.entries(COMPOSITES_ESPERADOS_DE_DEFAULT_ROLES.clientes).map(([clientId, papeis]) => [clientId, conjunto(papeis)]),
  ),
});
compararComEspecificacao(
  compositesDeClientesPorNome,
  especificacaoDeCompositesDeClientes,
  'realm.default-roles-cdd.composites.clientes',
  falhas,
);

const realmManagement = encontrarCliente('realm-management');
if (realmManagement) {
  const todosOsClientIdsConhecidos = new Set([...Object.keys(MODELO_CLIENTES), ...Object.keys(CLIENTES_EMBUTIDOS_E_ADMIN_CLI)]);
  for (const clientId of todosOsClientIdsConhecidos) {
    const clienteVivo = encontrarCliente(clientId);
    if (!clienteVivo) continue;
    const caminho = `clientes[${clientId}].scope-mappings`;

    const papeisDeRealmNoEscopo = (await chamarAdminApi(token, `/clients/${clienteVivo.id}/scope-mappings/realm`)) ?? [];
    compararComEspecificacao(papeisDeRealmNoEscopo.map((papel) => papel.name), conjunto([]), `${caminho}.realm`, falhas);

    const papeisDeRealmManagementNoEscopo =
      (await chamarAdminApi(token, `/clients/${clienteVivo.id}/scope-mappings/clients/${realmManagement.id}`)) ?? [];
    compararComEspecificacao(
      papeisDeRealmManagementNoEscopo.map((papel) => papel.name),
      conjunto(SCOPE_MAPPINGS_DE_REALM_MANAGEMENT_ESPERADOS[clientId] ?? []),
      `${caminho}['realm-management']`,
      falhas,
    );
  }
}

for (const [clientId, esperado] of Object.entries(CLIENTES_EMBUTIDOS_E_ADMIN_CLI)) {
  const clienteVivo = encontrarCliente(clientId);
  const caminho = `clientesEmbutidos[${clientId}]`;
  if (!clienteVivo) {
    falhas.push(`${caminho} não foi encontrado no realm importado`);
    continue;
  }

  if (clienteVivo.directAccessGrantsEnabled !== esperado.directAccessGrantsEnabled) {
    falhas.push(
      `${caminho}.directAccessGrantsEnabled precisa ser ${esperado.directAccessGrantsEnabled}, encontrado ${clienteVivo.directAccessGrantsEnabled}`,
    );
  }

  if (clienteVivo.serviceAccountsEnabled !== esperado.serviceAccountsEnabled) {
    falhas.push(
      `${caminho}.serviceAccountsEnabled precisa ser ${esperado.serviceAccountsEnabled}, encontrado ${clienteVivo.serviceAccountsEnabled}`,
    );
  }

  const dispositivoLigado = normalizarBooleanoTexto((clienteVivo.attributes ?? {})['oauth2.device.authorization.grant.enabled']) === 'true';
  if (dispositivoLigado) {
    falhas.push(`${caminho} precisa ter o device flow desligado, encontrado ligado`);
  }

  const mapeadorDeAudienciaCddApi = (clienteVivo.protocolMappers ?? []).some(
    (mapeador) =>
      mapeador.protocolMapper === 'oidc-audience-mapper' &&
      (mapeador.config?.['included.client.audience'] === 'cdd-api' || mapeador.config?.['included.custom.audience'] === 'cdd-api'),
  );
  if (mapeadorDeAudienciaCddApi) {
    falhas.push(`${caminho} não pode ter mapeador de audiência para cdd-api`);
  }
}

sugerirZerarNaFalha(falhas);

if (falhas.length > 0) {
  console.error(`verificar-realm-importado: ${falhas.length} divergência(s) entre o Keycloak importado e o modelo`);
  for (const falha of falhas) console.error(`  - ${falha}`);
  process.exit(1);
}

console.log('verificar-realm-importado: o realm cdd importado bate com o modelo');
