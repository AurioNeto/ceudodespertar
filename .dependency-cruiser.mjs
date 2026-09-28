const RAIZ_DE_MODULO = '(?:^|/)apps/api/src/modules/([^/]+)/';
const CAMADA_DE_DOMINIO = '(?:^|/)apps/api/src/(?:shared/kernel|modules/([^/]+)/domain)/';
const PACOTES_DE_FRAMEWORK = ['@nestjs', '@mikro-orm', 'pg', 'zod', 'kysely', 'express'];
const CAMINHO_DE_FRAMEWORK = `node_modules/(?:@types/)?(?:${PACOTES_DE_FRAMEWORK.join('|')})/`;

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
