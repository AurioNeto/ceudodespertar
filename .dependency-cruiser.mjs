const RAIZ_DE_MODULO = '(?:^|/)apps/api/src/modules/([^/]+)/';
const CAMADA_DE_DOMINIO = '(?:^|/)apps/api/src/(?:shared/kernel|modules/([^/]+)/domain)/';
const PACOTES_DE_FRAMEWORK = ['@nestjs', '@mikro-orm', 'pg', 'zod', 'kysely', 'express'];
const CAMINHO_DE_FRAMEWORK = `node_modules/(?:@types/)?(?:${PACOTES_DE_FRAMEWORK.join('|')})/`;
const CAMINHO_DO_ORM = 'node_modules/@mikro-orm/';
const CAMADAS_COM_ACESSO_AO_ORM = [
  '(?:^|/)apps/api/src/shared/infrastructure/banco/',
  '(?:^|/)apps/api/src/banco/',
  '(?:^|/)apps/api/src/modules/[^/]+/infrastructure/',
];

export default {
  forbidden: [
    {
      name: 'sem-dependencia-circular',
      severity: 'error',
      comment: 'Nenhuma dependência circular no grafo de import.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'dominio-sem-framework',
      severity: 'error',
      comment:
        'Documento 7 §4: "domain/ sem import de Nest, MikroORM, Zod ou HTTP"; ' +
        'vale também para shared/kernel, a base do domínio (§3, linha "shared").',
      from: { path: CAMADA_DE_DOMINIO },
      to: {
        path: [CAMINHO_DE_FRAMEWORK, '^(?:http|https|http2)$'],
      },
    },
    {
      name: 'orm-so-na-infraestrutura-de-banco',
      severity: 'error',
      comment:
        'MikroORM só é importado pela infraestrutura de banco compartilhada e pela infraestrutura ' +
        'de cada módulo (entidades, mappers e repositórios, Documento 7 §3). application, interface ' +
        'e o resto de shared/infrastructure recebem o contexto da UnidadeDeTrabalho. A regra limita ' +
        'imports, não chamadas: em.fork() sobre o contexto recebido continua fora do alcance dela. ' +
        'O domínio já é coberto por dominio-sem-framework.',
      from: {
        path: '(?:^|/)apps/api/src/',
        pathNot: [...CAMADAS_COM_ACESSO_AO_ORM, CAMADA_DE_DOMINIO],
      },
      to: { path: CAMINHO_DO_ORM },
    },
    {
      name: 'dominio-sem-camadas-externas',
      severity: 'error',
      comment:
        'Documento 7 §4: "o domínio não sabe que existe banco" — dentro de apps/api/src/, ' +
        'domain/ e shared/kernel só podem importar o próprio shared/kernel e o domain do ' +
        'próprio módulo. Lista do que é permitido: pasta nova em apps/api/src/ (banco/, ' +
        'composicao/, main.ts, um shared/<algo> ou modules/*/<algo> futuro) nasce bloqueada, ' +
        'sem precisar entrar nesta regra.',
      from: { path: CAMADA_DE_DOMINIO },
      to: {
        path: '(?:^|/)apps/api/src/',
        pathNot: [
          '(?:^|/)apps/api/src/shared/kernel/',
          '(?:^|/)apps/api/src/modules/$1/domain/',
        ],
      },
    },
    {
      name: 'modulo-so-por-public-api',
      severity: 'error',
      comment:
        'Documento 7 §3, regra 1: "Um módulo só importa de outro o arquivo public-api.ts ' +
        'dele — nunca domain/, nunca infrastructure/."',
      from: { path: RAIZ_DE_MODULO },
      to: {
        path: '(?:^|/)apps/api/src/modules/(?!$1/)[^/]+/',
        pathNot: '(?:^|/)apps/api/src/modules/[^/]+/public-api\\.ts$',
      },
    },
    {
      name: 'cli-da-identidade-nao-importa-o-migrador',
      severity: 'error',
      comment:
        'O CLI da identidade roda como cdd_app (BANCO_URL) e nunca importa direto o ambiente, as opções ' +
        'ou o CLI do migrador (BANCO_URL_MIGRACAO, papel cdd_owner).',
      from: { path: '(?:^|/)apps/api/src/identidade-cli/' },
      to: { path: '(?:^|/)apps/api/src/banco/(?:ambiente-do-migrador|opcoes-do-migrador|cli)\\.ts$' },
    },
    {
      name: 'contracts-nao-importa-apps',
      severity: 'error',
      comment: 'packages/contracts é a base do workspace — não depende de apps/.',
      from: { path: '(?:^|/)packages/contracts/src/' },
      to: { path: '(?:^|/)apps/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
  },
};
