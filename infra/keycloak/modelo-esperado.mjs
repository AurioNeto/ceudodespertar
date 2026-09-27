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

function mapeadorSoIdToken({ name, protocolMapper, config }) {
  return objeto({
    obrigatorias: {
      name: valor(name),
      protocol: valor('openid-connect'),
      protocolMapper: valor(protocolMapper),
      consentRequired: valor(false),
      config: objeto({
        obrigatorias: Object.fromEntries(Object.entries(config).map(([chave, valorDoCampo]) => [chave, valor(valorDoCampo)])),
      }),
    },
  });
}

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
      defaultClientScopes: conjunto(['web-origins', 'acr', 'roles', 'basic']),
      optionalClientScopes: conjunto([]),
      description: valor(
        'Confidencial, só conta de serviço; usado pela API para gerenciar usuários do Keycloak (papel manage-users).',
      ),
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
      redirectUris: conjunto([]),
      defaultClientScopes: conjunto(['web-origins', 'acr', 'roles', 'basic']),
      optionalClientScopes: conjunto([]),
      description: valor(
        'Somente ambiente local/CI de desenvolvimento — obtém token sem navegador para o e2e. Não usar fora de desenvolvimento.',
      ),
      protocolMappers: listaDeObjetos({ chavePrimaria: 'name', itens: MAPEADORES_DE_IDENTIDADE_ITENS }),
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
