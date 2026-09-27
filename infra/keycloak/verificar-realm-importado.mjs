import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATRIBUTOS_VIVOS_POR_CLIENTE,
  CLIENTES_EMBUTIDOS_E_ADMIN_CLI,
  ESCOPOS_ATRIBUIDOS_POR_CLIENTE,
  ESCOPOS_PADRAO_DO_REALM,
  MAPEADORES_POR_ESCOPO_PADRAO,
  MODELO_CLIENTES,
  MODELO_REALM_VIVO,
  PAPEIS_EFETIVOS_ESPERADOS,
  PROTOCOL_MAPPERS_VIVOS_POR_CLIENTE,
  compararComEspecificacao,
  conjunto,
  extrairCampos,
  objeto,
  objetoComApenas,
} from './modelo-esperado.mjs';

const TEMPO_LIMITE_MS = 20000;
const NOME_DO_REALM = 'cdd';

const diretorioDoScript = dirname(fileURLToPath(import.meta.url));
const raizDoRepositorio = join(diretorioDoScript, '..', '..');

function carregarEnvExample() {
  const caminhoDoEnv = join(raizDoRepositorio, '.env');
  if (!existsSync(caminhoDoEnv)) return;
  for (const linha of readFileSync(caminhoDoEnv, 'utf8').split('\n')) {
    const semComentario = linha.trim();
    if (semComentario === '' || semComentario.startsWith('#')) continue;
    const indiceDoIgual = semComentario.indexOf('=');
    if (indiceDoIgual === -1) continue;
    const chave = semComentario.slice(0, indiceDoIgual);
    const valorBruto = semComentario.slice(indiceDoIgual + 1);
    if (process.env[chave] === undefined) {
      process.env[chave] = valorBruto;
    }
  }
}

carregarEnvExample();

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

const todosOsClientes = (await chamarAdminApi(token, '/clients')) ?? [];

function encontrarCliente(clientId) {
  return todosOsClientes.find((cliente) => cliente.clientId === clientId);
}

for (const clientId of Object.keys(MODELO_CLIENTES)) {
  const clienteVivo = encontrarCliente(clientId);
  const caminho = `clientes[${clientId}]`;
  if (!clienteVivo) {
    falhas.push(`${caminho} não foi encontrado no realm importado`);
    continue;
  }

  const modeloDoCliente = MODELO_CLIENTES[clientId];
  const chavesEscalares = Object.keys(modeloDoCliente.obrigatorias).filter(
    (chave) => !['attributes', 'protocolMappers', 'secret'].includes(chave),
  );
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

const escoposConsultados = new Map();

async function obterMapeadoresDoEscopo(escopoId, nomeDoEscopo) {
  if (escoposConsultados.has(nomeDoEscopo)) return escoposConsultados.get(nomeDoEscopo);
  const detalhe = await chamarAdminApi(token, `/client-scopes/${escopoId}`);
  const nomes = (detalhe?.protocolMappers ?? []).map((mapeador) => mapeador.name);
  escoposConsultados.set(nomeDoEscopo, nomes);
  return nomes;
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
    const nomesEsperados = MAPEADORES_POR_ESCOPO_PADRAO[escopoVivo.name];
    if (!nomesEsperados) continue;
    const nomesVivos = await obterMapeadoresDoEscopo(escopoVivo.id, escopoVivo.name);
    compararComEspecificacao(
      nomesVivos,
      conjunto(nomesEsperados),
      `escopos[${escopoVivo.name}].protocolMappers`,
      falhas,
    );
  }
}

async function obterIdDoUsuario(nomeDeUsuario) {
  const usuarios = (await chamarAdminApi(token, `/users?username=${encodeURIComponent(nomeDeUsuario)}&exact=true`)) ?? [];
  return usuarios[0]?.id ?? null;
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

  const dispositivoLigado = (clienteVivo.attributes ?? {})['oauth2.device.authorization.grant.enabled'] === 'true';
  if (dispositivoLigado) {
    falhas.push(`${caminho} precisa ter o device flow desligado, encontrado ligado`);
  }

  const mapeadorDeAudienciaCddApi = (clienteVivo.protocolMappers ?? []).some(
    (mapeador) => mapeador.protocolMapper === 'oidc-audience-mapper' && mapeador.config?.['included.client.audience'] === 'cdd-api',
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
