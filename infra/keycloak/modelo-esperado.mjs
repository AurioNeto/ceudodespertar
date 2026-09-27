export function ehPlaceholderDeAmbiente(valorAtual) {
  return typeof valorAtual === 'string' && /^\$\{[A-Z][A-Z0-9_]*\}$/.test(valorAtual);
}

export function valor(valorExato) {
  return { tipo: 'valor', valorExato };
}

export function placeholder(nomeDaVariavel) {
  return { tipo: 'placeholder', nomeDaVariavel };
}

export function conjunto(valoresExatos) {
  return { tipo: 'conjunto', valoresExatos };
}

export function objeto({ obrigatorias = {}, opcionais = {} } = {}) {
  return { tipo: 'objeto', obrigatorias, opcionais };
}

export function listaDeObjetos({ chavePrimaria, itens }) {
  return { tipo: 'lista-de-objetos', chavePrimaria, itens };
}

export function customizado(validar) {
  return { tipo: 'customizado', validar };
}

export function verificarPlaceholderLiteral(atual, nomeDaVariavel, caminho, falhas) {
  const esperado = `\${${nomeDaVariavel}}`;
  if (atual !== esperado) {
    falhas.push(`${caminho} precisa ser exatamente o placeholder "${esperado}", encontrado ${JSON.stringify(atual)}`);
  }
}

export function compararComEspecificacao(atual, especificacao, caminho, falhas, opcoes = {}) {
  const contexto = opcoes.contexto ?? {};
  const verificarPlaceholder = opcoes.verificarPlaceholder ?? verificarPlaceholderLiteral;

  switch (especificacao.tipo) {
    case 'valor': {
      if (atual !== especificacao.valorExato) {
        falhas.push(
          `${caminho} precisa ser exatamente ${JSON.stringify(especificacao.valorExato)}, encontrado ${JSON.stringify(atual)}`,
        );
      }
      return;
    }

    case 'placeholder': {
      verificarPlaceholder(atual, especificacao.nomeDaVariavel, caminho, falhas);
      return;
    }

    case 'conjunto': {
      if (!Array.isArray(atual)) {
        falhas.push(`${caminho} precisa ser um array`);
        return;
      }
      const atualOrdenado = [...atual].sort();
      const esperadoOrdenado = [...especificacao.valoresExatos].sort();
      const igual =
        atualOrdenado.length === esperadoOrdenado.length &&
        atualOrdenado.every((item, indice) => item === esperadoOrdenado[indice]);
      if (!igual) {
        falhas.push(
          `${caminho} precisa ser exatamente o conjunto ${JSON.stringify(especificacao.valoresExatos)}, encontrado ${JSON.stringify(atual)}`,
        );
      }
      return;
    }

    case 'objeto': {
      if (atual === null || typeof atual !== 'object' || Array.isArray(atual)) {
        falhas.push(`${caminho} precisa ser um objeto, encontrado ${JSON.stringify(atual)}`);
        return;
      }
      const chavesObrigatorias = Object.keys(especificacao.obrigatorias);
      const chavesOpcionais = Object.keys(especificacao.opcionais ?? {});
      const chavesPermitidas = new Set([...chavesObrigatorias, ...chavesOpcionais]);

      for (const chave of Object.keys(atual)) {
        if (!chavesPermitidas.has(chave)) {
          falhas.push(`${caminho} não pode ter a chave desconhecida "${chave}"`);
        }
      }
      for (const chave of chavesObrigatorias) {
        if (!(chave in atual)) {
          falhas.push(`${caminho} precisa ter a chave "${chave}"`);
          continue;
        }
        compararComEspecificacao(atual[chave], especificacao.obrigatorias[chave], `${caminho}.${chave}`, falhas, opcoes);
      }
      for (const chave of chavesOpcionais) {
        if (chave in atual) {
          compararComEspecificacao(atual[chave], especificacao.opcionais[chave], `${caminho}.${chave}`, falhas, opcoes);
        }
      }
      return;
    }

    case 'lista-de-objetos': {
      if (!Array.isArray(atual)) {
        falhas.push(`${caminho} precisa ser um array`);
        return;
      }
      const { chavePrimaria } = especificacao;
      const valoresPrimarios = atual.map((item) => item?.[chavePrimaria]);
      const semDuplicatas = new Set(valoresPrimarios).size === valoresPrimarios.length;
      if (!semDuplicatas) {
        falhas.push(`${caminho}[].${chavePrimaria} não pode ter valor duplicado, encontrado ${JSON.stringify(valoresPrimarios)}`);
      }

      const chavesEsperadas = [...Object.keys(especificacao.itens)].sort();
      const chavesAtuais = [...valoresPrimarios].sort();
      const igual =
        chavesAtuais.length === chavesEsperadas.length &&
        chavesAtuais.every((item, indice) => item === chavesEsperadas[indice]);
      if (!igual) {
        falhas.push(
          `${caminho}[].${chavePrimaria} precisa ser exatamente ${JSON.stringify(chavesEsperadas)}, encontrado ${JSON.stringify(valoresPrimarios)}`,
        );
      }

      for (const [chaveDoItem, especificacaoDoItem] of Object.entries(especificacao.itens)) {
        const item = atual.find((candidato) => candidato?.[chavePrimaria] === chaveDoItem);
        if (!item) continue;
        compararComEspecificacao(item, especificacaoDoItem, `${caminho}[${chavePrimaria}=${chaveDoItem}]`, falhas, opcoes);
      }
      return;
    }

    case 'customizado': {
      especificacao.validar(atual, caminho, falhas, contexto);
      return;
    }

    default:
      throw new Error(`especificação desconhecida: ${especificacao.tipo}`);
  }
}

export function extrairPlaceholdersDeAmbiente(valorQualquer, encontrados = new Set()) {
  if (typeof valorQualquer === 'string') {
    if (ehPlaceholderDeAmbiente(valorQualquer)) encontrados.add(valorQualquer);
    return encontrados;
  }
  if (Array.isArray(valorQualquer)) {
    for (const item of valorQualquer) extrairPlaceholdersDeAmbiente(item, encontrados);
    return encontrados;
  }
  if (valorQualquer !== null && typeof valorQualquer === 'object') {
    for (const chave of Object.keys(valorQualquer)) extrairPlaceholdersDeAmbiente(valorQualquer[chave], encontrados);
    return encontrados;
  }
  return encontrados;
}

export function normalizarBooleanoTexto(valorAtual) {
  return typeof valorAtual === 'string' ? valorAtual.toLowerCase() : valorAtual;
}

function validarCampoQueDeveFicarVazio(atual, caminho, falhas) {
  if (atual !== '' && atual !== null && atual !== undefined) {
    falhas.push(`${caminho} precisa ficar vazio (sem rootUrl), encontrado ${JSON.stringify(atual)}`);
  }
}

const MAPEADOR_AUDIENCIA_CDD_API = objeto({
  obrigatorias: {
    name: valor('audiencia-cdd-api'),
    protocol: valor('openid-connect'),
    protocolMapper: valor('oidc-audience-mapper'),
    consentRequired: valor(false),
    config: objeto({
      obrigatorias: {
        'included.client.audience': valor('cdd-api'),
        'id.token.claim': valor('false'),
        'access.token.claim': valor('true'),
      },
    }),
  },
});

function mapeadorPadrao({ name, protocol = 'openid-connect', protocolMapper, config }) {
  return objeto({
    obrigatorias: {
      name: valor(name),
      protocol: valor(protocol),
      protocolMapper: valor(protocolMapper),
      consentRequired: valor(false),
      config: objeto({
        obrigatorias: Object.fromEntries(Object.entries(config).map(([chave, valorDoCampo]) => [chave, valor(valorDoCampo)])),
      }),
    },
  });
}

const mapeadorSoIdToken = mapeadorPadrao;

const MAPEADORES_SO_ID_TOKEN_ITENS = {
  'nome-completo-so-id-token': mapeadorSoIdToken({
    name: 'nome-completo-so-id-token',
    protocolMapper: 'oidc-full-name-mapper',
    config: { 'id.token.claim': 'true', 'access.token.claim': 'false', 'userinfo.token.claim': 'true' },
  }),
  'nome-preferido-so-id-token': mapeadorSoIdToken({
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
  }),
  'primeiro-nome-so-id-token': mapeadorSoIdToken({
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
  }),
  'sobrenome-so-id-token': mapeadorSoIdToken({
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
  }),
  'e-mail-so-id-token': mapeadorSoIdToken({
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
  }),
  'e-mail-verificado-so-id-token': mapeadorSoIdToken({
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
  }),
};

const MAPEADORES_DE_IDENTIDADE_ITENS = {
  'audiencia-cdd-api': MAPEADOR_AUDIENCIA_CDD_API,
  ...MAPEADORES_SO_ID_TOKEN_ITENS,
};

function validarLoginTheme(atual, caminho, falhas, contexto) {
  if (atual === 'cdd') {
    falhas.push(`${caminho} "cdd" ainda não existe (entra na peça I09)`);
    return;
  }
  if (typeof contexto.existeTema === 'function' && !contexto.existeTema(atual)) {
    falhas.push(`${caminho} "${atual}" não existe em infra/keycloak/themes`);
  }
}

export const MODELO_CLIENTES = {
  'cdd-web': objeto({
    obrigatorias: {
      clientId: valor('cdd-web'),
      enabled: valor(true),
      protocol: valor('openid-connect'),
      publicClient: valor(true),
      standardFlowEnabled: valor(true),
      directAccessGrantsEnabled: valor(false),
      implicitFlowEnabled: valor(false),
      serviceAccountsEnabled: valor(false),
      fullScopeAllowed: valor(false),
      redirectUris: conjunto(['http://localhost:5173/*']),
      webOrigins: conjunto(['http://localhost:5173']),
      defaultClientScopes: conjunto(['web-origins', 'acr', 'roles', 'basic']),
      optionalClientScopes: conjunto([]),
      attributes: objeto({
        obrigatorias: {
          'pkce.code.challenge.method': valor('S256'),
          'post.logout.redirect.uris': valor('http://localhost:5173/*'),
        },
      }),
      protocolMappers: listaDeObjetos({ chavePrimaria: 'name', itens: MAPEADORES_DE_IDENTIDADE_ITENS }),
    },
    opcionais: {
      rootUrl: customizado(validarCampoQueDeveFicarVazio),
    },
  }),

  'cdd-api-admin': objeto({
    obrigatorias: {
      clientId: valor('cdd-api-admin'),
      enabled: valor(true),
      protocol: valor('openid-connect'),
      publicClient: valor(false),
      clientAuthenticatorType: valor('client-secret'),
      secret: placeholder('CDD_KC_ADMIN_SEGREDO'),
      standardFlowEnabled: valor(false),
      directAccessGrantsEnabled: valor(false),
      implicitFlowEnabled: valor(false),
      serviceAccountsEnabled: valor(true),
      fullScopeAllowed: valor(false),
      webOrigins: conjunto([]),
      defaultClientScopes: conjunto(['web-origins', 'service_account', 'acr', 'roles', 'basic']),
      optionalClientScopes: conjunto([]),
      description: valor(
        'Confidencial, só conta de serviço; usado pela API para gerenciar usuários do Keycloak (papel manage-users).',
      ),
    },
    opcionais: {
      rootUrl: customizado(validarCampoQueDeveFicarVazio),
    },
  }),

  'cdd-teste': objeto({
    obrigatorias: {
      clientId: valor('cdd-teste'),
      enabled: valor(true),
      protocol: valor('openid-connect'),
      publicClient: valor(true),
      standardFlowEnabled: valor(false),
      directAccessGrantsEnabled: valor(true),
      implicitFlowEnabled: valor(false),
      serviceAccountsEnabled: valor(false),
      fullScopeAllowed: valor(false),
      redirectUris: conjunto([]),
      webOrigins: conjunto([]),
      defaultClientScopes: conjunto(['web-origins', 'acr', 'roles', 'basic']),
      optionalClientScopes: conjunto([]),
      description: valor(
        'Somente ambiente local/CI de desenvolvimento — obtém token sem navegador para o e2e. Não usar fora de desenvolvimento.',
      ),
      protocolMappers: listaDeObjetos({ chavePrimaria: 'name', itens: MAPEADORES_DE_IDENTIDADE_ITENS }),
    },
    opcionais: {
      rootUrl: customizado(validarCampoQueDeveFicarVazio),
    },
  }),

  'admin-cli': objeto({
    obrigatorias: {
      clientId: valor('admin-cli'),
      name: valor('${client_admin-cli}'),
      surrogateAuthRequired: valor(false),
      enabled: valor(true),
      alwaysDisplayInConsole: valor(false),
      clientAuthenticatorType: valor('client-secret'),
      redirectUris: conjunto([]),
      webOrigins: conjunto([]),
      notBefore: valor(0),
      bearerOnly: valor(false),
      consentRequired: valor(false),
      standardFlowEnabled: valor(false),
      implicitFlowEnabled: valor(false),
      directAccessGrantsEnabled: valor(true),
      serviceAccountsEnabled: valor(false),
      publicClient: valor(true),
      frontchannelLogout: valor(false),
      protocol: valor('openid-connect'),
      attributes: objeto({
        obrigatorias: {
          realm_client: valor('false'),
          'client.use.lightweight.access.token.enabled': valor('true'),
        },
      }),
      authenticationFlowBindingOverrides: objeto({}),
      fullScopeAllowed: valor(true),
      nodeReRegistrationTimeout: valor(0),
      defaultClientScopes: conjunto(['web-origins', 'acr', 'profile', 'roles', 'basic', 'email']),
      optionalClientScopes: conjunto(['address', 'phone', 'organization', 'microprofile-jwt']),
    },
  }),
};

export const MODELO_USUARIOS = {
  'dev@cdd.local': objeto({
    obrigatorias: {
      username: valor('dev@cdd.local'),
      email: valor('dev@cdd.local'),
      firstName: valor('Dev'),
      lastName: valor('CDD'),
      enabled: valor(true),
      emailVerified: valor(true),
      credentials: listaDeObjetos({
        chavePrimaria: 'type',
        itens: {
          password: objeto({
            obrigatorias: {
              type: valor('password'),
              value: placeholder('CDD_KC_DEV_SENHA'),
              temporary: valor(false),
            },
          }),
        },
      }),
    },
  }),

  'service-account-cdd-api-admin': objeto({
    obrigatorias: {
      username: valor('service-account-cdd-api-admin'),
      enabled: valor(true),
      serviceAccountClientId: valor('cdd-api-admin'),
      clientRoles: objeto({
        obrigatorias: {
          'realm-management': conjunto(['manage-users']),
        },
      }),
    },
  }),
};

export const MODELO_REALM = objeto({
  obrigatorias: {
    realm: valor('cdd'),
    enabled: valor(true),
    registrationAllowed: valor(false),
    resetPasswordAllowed: valor(true),
    loginWithEmailAllowed: valor(true),
    duplicateEmailsAllowed: valor(false),
    editUsernameAllowed: valor(false),

    bruteForceProtected: valor(true),
    permanentLockout: valor(false),
    failureFactor: valor(5),
    waitIncrementSeconds: valor(60),
    quickLoginCheckMilliSeconds: valor(1000),
    minimumQuickLoginWaitSeconds: valor(60),
    maxFailureWaitSeconds: valor(900),
    maxDeltaTimeSeconds: valor(43200),

    passwordPolicy: valor('length(10) and digits(1) and notEmail and notUsername and lowerCase(1)'),

    accessTokenLifespan: valor(300),
    ssoSessionIdleTimeout: valor(1800),
    ssoSessionMaxLifespan: valor(28800),
    revokeRefreshToken: valor(true),
    refreshTokenMaxReuse: valor(0),
    rememberMe: valor(false),

    offlineSessionMaxLifespanEnabled: valor(true),
    offlineSessionMaxLifespan: valor(28800),

    internationalizationEnabled: valor(true),
    supportedLocales: conjunto(['pt-BR']),
    defaultLocale: valor('pt-BR'),

    smtpServer: objeto({
      obrigatorias: {
        host: valor('mailpit'),
        port: valor('1025'),
        from: valor('noreply@cdd.local'),
        fromDisplayName: valor('CDD'),
        ssl: valor('false'),
        starttls: valor('false'),
        auth: valor('false'),
      },
    }),

    clientScopeMappings: objeto({
      obrigatorias: {
        'realm-management': listaDeObjetos({
          chavePrimaria: 'client',
          itens: {
            'cdd-api-admin': objeto({
              obrigatorias: { client: valor('cdd-api-admin'), roles: conjunto(['manage-users']) },
            }),
          },
        }),
      },
    }),

    clients: listaDeObjetos({ chavePrimaria: 'clientId', itens: MODELO_CLIENTES }),
    users: listaDeObjetos({ chavePrimaria: 'username', itens: MODELO_USUARIOS }),
  },
  opcionais: {
    loginTheme: customizado(validarLoginTheme),
  },
});

export const VARIAVEIS_DE_AMBIENTE = {
  placeholdersDoRealm: ['CDD_KC_ADMIN_SEGREDO', 'CDD_KC_DEV_SENHA'],
  chavesDeAmbienteDoServicoKeycloakNoCompose: [
    'KC_BOOTSTRAP_ADMIN_USERNAME',
    'KC_BOOTSTRAP_ADMIN_PASSWORD',
    'KC_HOSTNAME',
    'KC_HEALTH_ENABLED',
    'CDD_KC_ADMIN_SEGREDO',
    'CDD_KC_DEV_SENHA',
  ],
};

export function objetoComApenas(especificacaoObjeto, chaves) {
  const obrigatorias = {};
  const opcionais = {};
  for (const chave of chaves) {
    if (chave in especificacaoObjeto.obrigatorias) {
      obrigatorias[chave] = especificacaoObjeto.obrigatorias[chave];
    } else if (especificacaoObjeto.opcionais && chave in especificacaoObjeto.opcionais) {
      opcionais[chave] = especificacaoObjeto.opcionais[chave];
    } else {
      throw new Error(`objetoComApenas: especificação não conhece a chave "${chave}"`);
    }
  }
  return objeto({ obrigatorias, opcionais });
}

export function extrairCampos(objetoQualquer, chaves) {
  const projetado = {};
  for (const chave of chaves) {
    if (objetoQualquer !== null && typeof objetoQualquer === 'object' && chave in objetoQualquer) {
      projetado[chave] = objetoQualquer[chave];
    }
  }
  return projetado;
}

const CAMPOS_ESCALARES_DO_REALM_VIVO = [
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
];

export const MODELO_REALM_VIVO = objeto({
  obrigatorias: {
    ...objetoComApenas(MODELO_REALM, CAMPOS_ESCALARES_DO_REALM_VIVO).obrigatorias,
    smtpServer: objetoComApenas(MODELO_REALM.obrigatorias.smtpServer, [
      'host',
      'port',
      'from',
      'fromDisplayName',
      'ssl',
      'starttls',
      'auth',
    ]),
    browserFlow: valor('browser'),
    directGrantFlow: valor('direct grant'),
    resetCredentialsFlow: valor('reset credentials'),

    accessCodeLifespan: valor(60),
    actionTokenGeneratedByUserLifespan: valor(300),
    sslRequired: valor('external'),

    otpPolicyType: valor('totp'),
    otpPolicyAlgorithm: valor('HmacSHA1'),
    otpPolicyInitialCounter: valor(0),
    otpPolicyDigits: valor(6),
    otpPolicyLookAheadWindow: valor(1),
    otpPolicyPeriod: valor(30),
    otpPolicyCodeReusable: valor(false),

    eventsEnabled: valor(false),
    adminEventsEnabled: valor(false),
    adminEventsDetailsEnabled: valor(false),
    eventsListeners: conjunto(['jboss-logging']),
  },
});

export const CAMPOS_ESCALARES_DE_CLIENTE_VIVO = [
  'clientId',
  'enabled',
  'protocol',
  'publicClient',
  'standardFlowEnabled',
  'directAccessGrantsEnabled',
  'implicitFlowEnabled',
  'serviceAccountsEnabled',
  'fullScopeAllowed',
  'defaultClientScopes',
  'optionalClientScopes',
];

const mapeadorAudienciaCddApiVivo = objeto({
  obrigatorias: {
    name: valor('audiencia-cdd-api'),
    protocol: valor('openid-connect'),
    protocolMapper: valor('oidc-audience-mapper'),
    consentRequired: valor(false),
    config: objeto({
      obrigatorias: {
        'included.client.audience': valor('cdd-api'),
        'id.token.claim': valor('false'),
        'access.token.claim': valor('true'),
        'userinfo.token.claim': valor('false'),
      },
    }),
  },
});

const MAPEADORES_DE_IDENTIDADE_ITENS_VIVOS = {
  ...MAPEADORES_SO_ID_TOKEN_ITENS,
  'audiencia-cdd-api': mapeadorAudienciaCddApiVivo,
};

export const PROTOCOL_MAPPERS_VIVOS_POR_CLIENTE = {
  'cdd-web': listaDeObjetos({ chavePrimaria: 'name', itens: MAPEADORES_DE_IDENTIDADE_ITENS_VIVOS }),
  'cdd-teste': listaDeObjetos({ chavePrimaria: 'name', itens: MAPEADORES_DE_IDENTIDADE_ITENS_VIVOS }),
  'cdd-api-admin': listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  'admin-cli': listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  account: listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  broker: listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  'realm-management': listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  'account-console': listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'audience resolve': mapeadorPadrao({ name: 'audience resolve', protocolMapper: 'oidc-audience-resolve-mapper', config: {} }),
    },
  }),
  'security-admin-console': listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      locale: mapeadorPadrao({
        name: 'locale',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'locale',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'locale',
          'jsonType.label': 'String',
        },
      }),
    },
  }),
};

export const ATRIBUTOS_VIVOS_POR_CLIENTE = {
  'cdd-web': objeto({
    obrigatorias: {
      realm_client: valor('false'),
      'post.logout.redirect.uris': valor('http://localhost:5173/*'),
      'pkce.code.challenge.method': valor('S256'),
    },
  }),
  'cdd-teste': objeto({
    obrigatorias: {
      realm_client: valor('false'),
      'post.logout.redirect.uris': valor('+'),
    },
  }),
  'cdd-api-admin': objeto({
    obrigatorias: {
      realm_client: valor('false'),
      'post.logout.redirect.uris': valor('+'),
    },
  }),
  'admin-cli': objeto({
    obrigatorias: {
      realm_client: valor('false'),
      'client.use.lightweight.access.token.enabled': valor('true'),
      'post.logout.redirect.uris': valor('+'),
    },
  }),
};

export const MAPEADORES_POR_ESCOPO_PADRAO = {
  'web-origins': listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'allowed web origins': mapeadorPadrao({
        name: 'allowed web origins',
        protocolMapper: 'oidc-allowed-origins-mapper',
        config: { 'introspection.token.claim': 'true', 'access.token.claim': 'true' },
      }),
    },
  }),
  acr: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'acr loa level': mapeadorPadrao({
        name: 'acr loa level',
        protocolMapper: 'oidc-acr-mapper',
        config: { 'id.token.claim': 'true', 'introspection.token.claim': 'true', 'access.token.claim': 'true' },
      }),
    },
  }),
  roles: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'realm roles': mapeadorPadrao({
        name: 'realm roles',
        protocolMapper: 'oidc-usermodel-realm-role-mapper',
        config: {
          'user.attribute': 'foo',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'realm_access.roles',
          'jsonType.label': 'String',
          multivalued: 'true',
        },
      }),
      'audience resolve': mapeadorPadrao({
        name: 'audience resolve',
        protocolMapper: 'oidc-audience-resolve-mapper',
        config: { 'introspection.token.claim': 'true', 'access.token.claim': 'true' },
      }),
      'client roles': mapeadorPadrao({
        name: 'client roles',
        protocolMapper: 'oidc-usermodel-client-role-mapper',
        config: {
          'user.attribute': 'foo',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'resource_access.${client_id}.roles',
          'jsonType.label': 'String',
          multivalued: 'true',
        },
      }),
    },
  }),
  basic: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      auth_time: mapeadorPadrao({
        name: 'auth_time',
        protocolMapper: 'oidc-usersessionmodel-note-mapper',
        config: {
          'user.session.note': 'AUTH_TIME',
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'auth_time',
          'jsonType.label': 'long',
        },
      }),
      sub: mapeadorPadrao({
        name: 'sub',
        protocolMapper: 'oidc-sub-mapper',
        config: { 'introspection.token.claim': 'true', 'access.token.claim': 'true' },
      }),
    },
  }),
  profile: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'full name': mapeadorPadrao({
        name: 'full name',
        protocolMapper: 'oidc-full-name-mapper',
        config: { 'id.token.claim': 'true', 'introspection.token.claim': 'true', 'access.token.claim': 'true', 'userinfo.token.claim': 'true' },
      }),
      'family name': mapeadorPadrao({
        name: 'family name',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'lastName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'family_name',
          'jsonType.label': 'String',
        },
      }),
      'given name': mapeadorPadrao({
        name: 'given name',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'firstName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'given_name',
          'jsonType.label': 'String',
        },
      }),
      'middle name': mapeadorPadrao({
        name: 'middle name',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'middleName',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'middle_name',
          'jsonType.label': 'String',
        },
      }),
      nickname: mapeadorPadrao({
        name: 'nickname',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'nickname',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'nickname',
          'jsonType.label': 'String',
        },
      }),
      username: mapeadorPadrao({
        name: 'username',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'username',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'preferred_username',
          'jsonType.label': 'String',
        },
      }),
      profile: mapeadorPadrao({
        name: 'profile',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'profile',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'profile',
          'jsonType.label': 'String',
        },
      }),
      picture: mapeadorPadrao({
        name: 'picture',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'picture',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'picture',
          'jsonType.label': 'String',
        },
      }),
      website: mapeadorPadrao({
        name: 'website',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'website',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'website',
          'jsonType.label': 'String',
        },
      }),
      gender: mapeadorPadrao({
        name: 'gender',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'gender',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'gender',
          'jsonType.label': 'String',
        },
      }),
      birthdate: mapeadorPadrao({
        name: 'birthdate',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'birthdate',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'birthdate',
          'jsonType.label': 'String',
        },
      }),
      zoneinfo: mapeadorPadrao({
        name: 'zoneinfo',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'zoneinfo',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'zoneinfo',
          'jsonType.label': 'String',
        },
      }),
      locale: mapeadorPadrao({
        name: 'locale',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'locale',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'locale',
          'jsonType.label': 'String',
        },
      }),
      'updated at': mapeadorPadrao({
        name: 'updated at',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'updatedAt',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'updated_at',
          'jsonType.label': 'long',
        },
      }),
    },
  }),
  email: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      email: mapeadorPadrao({
        name: 'email',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'email',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'email',
          'jsonType.label': 'String',
        },
      }),
      'email verified': mapeadorPadrao({
        name: 'email verified',
        protocolMapper: 'oidc-usermodel-property-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'emailVerified',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'email_verified',
          'jsonType.label': 'boolean',
        },
      }),
    },
  }),
  address: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      address: mapeadorPadrao({
        name: 'address',
        protocolMapper: 'oidc-address-mapper',
        config: {
          'user.attribute.formatted': 'formatted',
          'user.attribute.country': 'country',
          'introspection.token.claim': 'true',
          'user.attribute.postal_code': 'postal_code',
          'userinfo.token.claim': 'true',
          'user.attribute.street': 'street',
          'id.token.claim': 'true',
          'user.attribute.region': 'region',
          'access.token.claim': 'true',
          'user.attribute.locality': 'locality',
        },
      }),
    },
  }),
  phone: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'phone number': mapeadorPadrao({
        name: 'phone number',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'phoneNumber',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'phone_number',
          'jsonType.label': 'String',
        },
      }),
      'phone number verified': mapeadorPadrao({
        name: 'phone number verified',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'phoneNumberVerified',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'phone_number_verified',
          'jsonType.label': 'boolean',
        },
      }),
    },
  }),
  organization: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      organization: mapeadorPadrao({
        name: 'organization',
        protocolMapper: 'oidc-organization-membership-mapper',
        config: {
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'organization',
          'jsonType.label': 'String',
          multivalued: 'true',
        },
      }),
    },
  }),
  'microprofile-jwt': listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      upn: mapeadorPadrao({
        name: 'upn',
        protocolMapper: 'oidc-usermodel-attribute-mapper',
        config: {
          'introspection.token.claim': 'true',
          'userinfo.token.claim': 'true',
          'user.attribute': 'username',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'upn',
          'jsonType.label': 'String',
        },
      }),
      groups: mapeadorPadrao({
        name: 'groups',
        protocolMapper: 'oidc-usermodel-realm-role-mapper',
        config: {
          'introspection.token.claim': 'true',
          multivalued: 'true',
          'user.attribute': 'foo',
          'id.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'groups',
          'jsonType.label': 'String',
        },
      }),
    },
  }),
  offline_access: listaDeObjetos({ chavePrimaria: 'name', itens: {} }),
  service_account: listaDeObjetos({
    chavePrimaria: 'name',
    itens: {
      'Client ID': mapeadorPadrao({
        name: 'Client ID',
        protocolMapper: 'oidc-usersessionmodel-note-mapper',
        config: {
          'user.session.note': 'client_id',
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'client_id',
          'jsonType.label': 'String',
        },
      }),
      'Client IP Address': mapeadorPadrao({
        name: 'Client IP Address',
        protocolMapper: 'oidc-usersessionmodel-note-mapper',
        config: {
          'user.session.note': 'clientAddress',
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'clientAddress',
          'jsonType.label': 'String',
        },
      }),
      'Client Host': mapeadorPadrao({
        name: 'Client Host',
        protocolMapper: 'oidc-usersessionmodel-note-mapper',
        config: {
          'user.session.note': 'clientHost',
          'id.token.claim': 'true',
          'introspection.token.claim': 'true',
          'access.token.claim': 'true',
          'claim.name': 'clientHost',
          'jsonType.label': 'String',
        },
      }),
    },
  }),
};

export const ESCOPOS_ATRIBUIDOS_POR_CLIENTE = {
  'cdd-web': { padrao: ['web-origins', 'acr', 'roles', 'basic'], opcionais: [] },
  'cdd-teste': { padrao: ['web-origins', 'acr', 'roles', 'basic'], opcionais: [] },
  'cdd-api-admin': { padrao: ['web-origins', 'service_account', 'acr', 'roles', 'basic'], opcionais: [] },
  'admin-cli': {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'organization', 'microprofile-jwt'],
  },
  account: {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'offline_access', 'organization', 'microprofile-jwt'],
  },
  'account-console': {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'offline_access', 'organization', 'microprofile-jwt'],
  },
  broker: {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'offline_access', 'organization', 'microprofile-jwt'],
  },
  'realm-management': {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'offline_access', 'organization', 'microprofile-jwt'],
  },
  'security-admin-console': {
    padrao: ['web-origins', 'acr', 'profile', 'roles', 'basic', 'email'],
    opcionais: ['address', 'phone', 'offline_access', 'organization', 'microprofile-jwt'],
  },
};

export const ESCOPOS_PADRAO_DO_REALM = {
  defaultDefaultClientScopes: conjunto(['acr', 'basic', 'email', 'profile', 'role_list', 'roles', 'saml_organization', 'web-origins']),
  defaultOptionalClientScopes: conjunto(['address', 'microprofile-jwt', 'offline_access', 'organization', 'phone']),
};

export const PAPEIS_EFETIVOS_ESPERADOS = {
  'dev@cdd.local': { realm: [], clientes: {} },
  'service-account-cdd-api-admin': { realm: [], clientes: { 'realm-management': ['manage-users'] } },
};

export const CLIENTES_EMBUTIDOS_E_ADMIN_CLI = {
  account: { directAccessGrantsEnabled: false, serviceAccountsEnabled: false },
  'account-console': { directAccessGrantsEnabled: false, serviceAccountsEnabled: false },
  broker: { directAccessGrantsEnabled: false, serviceAccountsEnabled: false },
  'realm-management': { directAccessGrantsEnabled: false, serviceAccountsEnabled: false },
  'security-admin-console': { directAccessGrantsEnabled: false, serviceAccountsEnabled: false },
  'admin-cli': { directAccessGrantsEnabled: true, serviceAccountsEnabled: false },
};

export const CLIENTES_SEM_OVERRIDE_DE_FLUXO_DECLARADO = [
  'cdd-web',
  'cdd-teste',
  'cdd-api-admin',
  'account',
  'account-console',
  'broker',
  'realm-management',
  'security-admin-console',
];

export const SCOPE_MAPPINGS_DE_REALM_MANAGEMENT_ESPERADOS = {
  'cdd-api-admin': ['manage-users'],
};

export const COMPOSITES_ESPERADOS_DE_DEFAULT_ROLES = {
  realm: ['offline_access', 'uma_authorization'],
  clientes: { account: ['view-profile', 'manage-account'] },
};

export const REQUIRED_ACTIONS_ESPERADAS = listaDeObjetos({
  chavePrimaria: 'alias',
  itens: Object.fromEntries(
    [
      { alias: 'CONFIGURE_TOTP', enabled: true, defaultAction: false },
      { alias: 'TERMS_AND_CONDITIONS', enabled: false, defaultAction: false },
      { alias: 'UPDATE_PASSWORD', enabled: true, defaultAction: false },
      { alias: 'UPDATE_PROFILE', enabled: true, defaultAction: false },
      { alias: 'VERIFY_EMAIL', enabled: true, defaultAction: false },
      { alias: 'delete_account', enabled: false, defaultAction: false },
      { alias: 'UPDATE_EMAIL', enabled: false, defaultAction: false },
      { alias: 'webauthn-register', enabled: true, defaultAction: false },
      { alias: 'webauthn-register-passwordless', enabled: true, defaultAction: false },
      { alias: 'VERIFY_PROFILE', enabled: true, defaultAction: false },
      { alias: 'delete_credential', enabled: true, defaultAction: false },
      { alias: 'idp_link', enabled: true, defaultAction: false },
      { alias: 'CONFIGURE_RECOVERY_AUTHN_CODES', enabled: true, defaultAction: false },
      { alias: 'update_user_locale', enabled: true, defaultAction: false },
    ].map(({ alias, enabled, defaultAction }) => [
      alias,
      objeto({ obrigatorias: { alias: valor(alias), enabled: valor(enabled), defaultAction: valor(defaultAction) } }),
    ]),
  ),
});

function execucao({ level, index, providerId = null, displayName = null, requirement }) {
  return { level, index, providerId, displayName, requirement };
}

export function execucoesDeFluxo(execucoesEsperadas) {
  return customizado((atual, caminho, falhas) => {
    if (!Array.isArray(atual)) {
      falhas.push(`${caminho} precisa ser um array de execuções`);
      return;
    }
    const atualNormalizado = atual.map((execucaoAtual) =>
      execucao({
        level: execucaoAtual.level,
        index: execucaoAtual.index,
        providerId: execucaoAtual.authenticationFlow ? null : (execucaoAtual.providerId ?? null),
        displayName: execucaoAtual.authenticationFlow ? execucaoAtual.displayName : null,
        requirement: execucaoAtual.requirement,
      }),
    );
    const igual =
      atualNormalizado.length === execucoesEsperadas.length &&
      atualNormalizado.every((execucaoAtual, indice) => {
        const esperada = execucoesEsperadas[indice];
        return (
          execucaoAtual.level === esperada.level &&
          execucaoAtual.index === esperada.index &&
          execucaoAtual.providerId === esperada.providerId &&
          execucaoAtual.displayName === esperada.displayName &&
          execucaoAtual.requirement === esperada.requirement
        );
      });
    if (!igual) {
      falhas.push(
        `${caminho} precisa ser exatamente ${JSON.stringify(execucoesEsperadas)}, encontrado ${JSON.stringify(atualNormalizado)}`,
      );
    }
  });
}

export const FLUXOS_VIVOS_ESPERADOS = {
  browser: execucoesDeFluxo([
    execucao({ level: 0, index: 0, providerId: 'auth-cookie', requirement: 'ALTERNATIVE' }),
    execucao({ level: 0, index: 1, providerId: 'auth-spnego', requirement: 'DISABLED' }),
    execucao({ level: 0, index: 2, providerId: 'identity-provider-redirector', requirement: 'ALTERNATIVE' }),
    execucao({ level: 0, index: 3, displayName: 'Organization', requirement: 'ALTERNATIVE' }),
    execucao({ level: 1, index: 0, displayName: 'Browser - Conditional Organization', requirement: 'CONDITIONAL' }),
    execucao({ level: 2, index: 0, providerId: 'conditional-user-configured', requirement: 'REQUIRED' }),
    execucao({ level: 2, index: 1, providerId: 'organization', requirement: 'ALTERNATIVE' }),
    execucao({ level: 0, index: 4, displayName: 'forms', requirement: 'ALTERNATIVE' }),
    execucao({ level: 1, index: 0, providerId: 'auth-username-password-form', requirement: 'REQUIRED' }),
    execucao({ level: 1, index: 1, displayName: 'Browser - Conditional 2FA', requirement: 'CONDITIONAL' }),
    execucao({ level: 2, index: 0, providerId: 'conditional-user-configured', requirement: 'REQUIRED' }),
    execucao({ level: 2, index: 1, providerId: 'conditional-credential', requirement: 'REQUIRED' }),
    execucao({ level: 2, index: 2, providerId: 'auth-otp-form', requirement: 'ALTERNATIVE' }),
    execucao({ level: 2, index: 3, providerId: 'webauthn-authenticator', requirement: 'DISABLED' }),
    execucao({ level: 2, index: 4, providerId: 'auth-recovery-authn-code-form', requirement: 'DISABLED' }),
  ]),
  'direct grant': execucoesDeFluxo([
    execucao({ level: 0, index: 0, providerId: 'direct-grant-validate-username', requirement: 'REQUIRED' }),
    execucao({ level: 0, index: 1, providerId: 'direct-grant-validate-password', requirement: 'REQUIRED' }),
    execucao({ level: 0, index: 2, displayName: 'Direct Grant - Conditional OTP', requirement: 'CONDITIONAL' }),
    execucao({ level: 1, index: 0, providerId: 'conditional-user-configured', requirement: 'REQUIRED' }),
    execucao({ level: 1, index: 1, providerId: 'direct-grant-validate-otp', requirement: 'REQUIRED' }),
  ]),
  'reset credentials': execucoesDeFluxo([
    execucao({ level: 0, index: 0, providerId: 'reset-credentials-choose-user', requirement: 'REQUIRED' }),
    execucao({ level: 0, index: 1, providerId: 'reset-credential-email', requirement: 'REQUIRED' }),
    execucao({ level: 0, index: 2, providerId: 'reset-password', requirement: 'REQUIRED' }),
    execucao({ level: 0, index: 3, displayName: 'Reset - Conditional OTP', requirement: 'CONDITIONAL' }),
    execucao({ level: 1, index: 0, providerId: 'conditional-user-configured', requirement: 'REQUIRED' }),
    execucao({ level: 1, index: 1, providerId: 'reset-otp', requirement: 'REQUIRED' }),
  ]),
};
