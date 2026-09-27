const RAIZ_DE_MODULO = '(?:^|/)apps/api/src/modules/([^/]+)/';
const CAMADA_DE_DOMINIO = '(?:^|/)apps/api/src/(?:shared/kernel|modules/[^/]+/domain)/';
const CAMADAS_EXTERNAS = '(?:^|/)apps/api/src/(?:shared/|modules/[^/]+/)(?:infrastructure|interface|application)/';

export default {
  forbidden: [
    {
      name: 'sem-dependencia-circular',
      severity: 'error',
      comment: 'item (a) da peça F06: nenhuma dependência circular no grafo de import.',
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
        path: [
          'node_modules/@nestjs/',
          'node_modules/@mikro-orm/',
          'node_modules/pg/',
          'node_modules/zod/',
          '^https?$',
        ],
      },
    },
    {
      name: 'dominio-sem-camadas-externas',
      severity: 'error',
      comment:
        'Documento 7 §4: "o domínio não sabe que existe banco" — domain/ e shared/kernel ' +
        'não importam infrastructure/, interface/ ou application/ de nenhum módulo.',
      from: { path: CAMADA_DE_DOMINIO },
      to: { path: CAMADAS_EXTERNAS },
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
      comment: 'item (d) da peça F06: packages/contracts é a base do workspace — não depende de apps/.',
      from: { path: '(?:^|/)packages/contracts/src/' },
      to: { path: '(?:^|/)apps/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
};
