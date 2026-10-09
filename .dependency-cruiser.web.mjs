import { fileURLToPath } from 'node:url';

const SRC = '(?:^|/)apps/web/src/';
const MODULOS_DE_PAGES = '(transversal|financeiro|eventos|estoque|pessoas|sistema)';
const UNIDADE_DE_PAGINA = '[A-Z][A-Za-z0-9]*Page';
const PASTA_DE_UNIDADE_NO_DESTINO = `${SRC}.*/[A-Z][^/]*/|${SRC}[A-Z][^/]*/`;
const PASTA_DE_MOCKS = `${SRC}(?:mocks|.*/mocks)/`;
const PASTA_CAMEL_CASE = `${SRC}.*/[a-z][^/A-Z]*[A-Z][^/]*/|${SRC}[a-z][^/A-Z]*[A-Z][^/]*/`;
const PROFUNDIDADE_MAXIMA_DE_UNIDADE = 6;
const LINHA_DE_BASE = 'Linha de base da main 1812df6 (404 avisos), reproduzível com pnpm fronteiras:web.';

function origemComUnidadesAninhadas(profundidade) {
  const unidadesCapturadas = '[^A-Z]*/[A-Z][^/]*)'.repeat(profundidade);

  return `^${'('.repeat(profundidade + 1)}.*apps/web/src)${unidadesCapturadas}[^A-Z]*/[^/]*$`;
}

function destinoLivreParaAsUnidadesDaOrigem(profundidade) {
  return Array.from(
    { length: profundidade + 1 },
    (_, indice) => `^$${indice + 1}/(?:[^A-Z]*/|)(?:[A-Z][^/]*/index[.]ts|[^/]*)$`,
  ).join('|');
}

function regraDeUnidadeSoPeloIndex(profundidade) {
  const origem =
    profundidade === 0
      ? 'origem fora de qualquer unidade'
      : `origem com ${profundidade} ${profundidade === 1 ? 'unidade aninhada' : 'unidades aninhadas'}`;

  return {
    name: `unidade-so-pelo-index-${profundidade}`,
    severity: 'error',
    comment:
      'Unidade é uma pasta PascalCase com index.ts como porta única; tudo dentro dela é privado à ' +
      'subárvore. De fora da unidade de destino, só se entra pelo index.ts do topo dela, o que vale ' +
      'também para irmão, primo e neto. Dentro da subárvore o acesso é livre, inclusive aos utils/ ' +
      'e mocks/ dos ancestrais. A regra captura o caminho de cada unidade da origem e aceita o destino ' +
      'quando o resto do caminho, depois da pasta inteira de uma delas ou da raiz, não tem pasta ' +
      'PascalCase ou tem uma só, como última pasta, com index.ts; Avisos não é a unidade Aviso. ' +
      `Variante: ${origem}. Na main de 09/10/2026 não há pasta ` +
      'de unidade: só a fixture prova.',
    from: { path: origemComUnidadesAninhadas(profundidade) },
    to: {
      path: PASTA_DE_UNIDADE_NO_DESTINO,
      pathNot: destinoLivreParaAsUnidadesDaOrigem(profundidade),
    },
  };
}

const REGRAS_DE_UNIDADE_SO_PELO_INDEX = Array.from(
  { length: PROFUNDIDADE_MAXIMA_DE_UNIDADE + 1 },
  (_, profundidade) => regraDeUnidadeSoPeloIndex(profundidade),
);

export default {
  forbidden: [
    {
      name: 'web-sem-ciclo',
      severity: 'warn',
      comment:
        `Nenhum ciclo no grafo do web; com tsPreCompilationDeps, import type conta. ${LINHA_DE_BASE}`,
      from: { path: SRC },
      to: { circular: true },
    },
    {
      name: 'lib-e-folha',
      severity: 'warn',
      comment:
        'lib/ só tem função pura: não importa outra camada nem React. testes/ fica fora do alvo; quem ' +
        `barra apoio de teste em código de produção é apoio-de-teste-so-em-teste. ${LINHA_DE_BASE}`,
      from: { path: `${SRC}lib/` },
      to: { path: `${SRC}(app|components|dados|ds|mocks|pages)/|node_modules/react(-dom)?/` },
    },
    {
      name: 'dados-sem-ui',
      severity: 'error',
      comment: 'A camada de dados não conhece UI, shell, demonstração nem React.',
      from: { path: `${SRC}dados/` },
      to: { path: `${SRC}(app|components|ds|mocks|pages)/|node_modules/react(-dom)?/` },
    },
    {
      name: 'ds-autonomo',
      severity: 'error',
      comment:
        'O ds é global por definição (catálogo do Doc 5 §4 e primitivos genéricos): só depende de lib/, ' +
        '@cdd/contracts e bibliotecas externas, nunca de react-router.',
      from: { path: `${SRC}ds/` },
      to: { path: `${SRC}(app|components|dados|mocks|pages)/|node_modules/react-router` },
    },
    {
      name: 'ds-so-pelo-barrel',
      severity: 'error',
      comment:
        'Fora do ds, só se importa ds/index.ts. O CSS de ds/fundacao entra por @import em ' +
        'styles/global.css, que o dependency-cruiser não lê.',
      from: { path: SRC, pathNot: `${SRC}ds/` },
      to: { path: `${SRC}ds/`, pathNot: `${SRC}ds/index[.]ts$` },
    },
    {
      name: 'ds-base-nao-sobe',
      severity: 'error',
      comment: 'fundacao e providers são a base dos níveis atômicos do ds e não importam nenhum deles.',
      from: { path: `${SRC}ds/(fundacao|providers)/` },
      to: { path: `${SRC}ds/(atoms|molecules|organisms|templates)/` },
    },
    {
      name: 'ds-atomo-nao-sobe',
      severity: 'error',
      comment: 'Átomo não importa nível de cima; átomo importa átomo e a base.',
      from: { path: `${SRC}ds/atoms/` },
      to: { path: `${SRC}ds/(molecules|organisms|templates)/` },
    },
    {
      name: 'ds-molecula-nao-sobe',
      severity: 'error',
      comment: 'Molécula compõe átomos, moléculas e a base.',
      from: { path: `${SRC}ds/molecules/` },
      to: { path: `${SRC}ds/(organisms|templates)/` },
    },
    {
      name: 'ds-organismo-nao-sobe',
      severity: 'error',
      comment: 'Organismo não depende de template.',
      from: { path: `${SRC}ds/organisms/` },
      to: { path: `${SRC}ds/templates/` },
    },
    {
      name: 'dados-so-pelo-barrel',
      severity: 'warn',
      comment:
        'Fora de dados/, só dados/index.ts; o main.tsx também importa dados/instancias.ts. ' +
        LINHA_DE_BASE,
      from: { path: SRC, pathNot: `${SRC}dados/` },
      to: { path: `${SRC}dados/`, pathNot: `${SRC}dados/(index|instancias)[.]ts$` },
    },
    {
      name: 'instancias-so-no-main',
      severity: 'error',
      comment:
        'UserManager e cliente HTTP reais nascem num lugar só, dados/instancias.ts, importado só pelo ' +
        'main.tsx; importar o barrel de dados não instancia nada. Na main de 09/10/2026 o arquivo ainda ' +
        'não existe: só a fixture prova.',
      from: { path: SRC, pathNot: `${SRC}main[.]tsx$` },
      to: { path: `${SRC}dados/instancias[.]ts$` },
    },
    {
      name: 'app-nao-conhece-paginas',
      severity: 'warn',
      comment:
        `Só o roteador, e os testes de app/, conhecem páginas. ${LINHA_DE_BASE}`,
      from: { path: `${SRC}app/`, pathNot: `${SRC}app/router[.]tsx$|[.]test[.]tsx?$` },
      to: { path: `${SRC}pages/` },
    },
    {
      name: 'roteador-so-pelo-index-da-pagina',
      severity: 'warn',
      comment:
        'O roteador importa a unidade de página pelo index.ts dela, o que habilita React.lazy por rota. ' +
        LINHA_DE_BASE,
      from: { path: `${SRC}app/router[.]tsx$` },
      to: { path: `${SRC}pages/`, pathNot: `${SRC}pages/.*/${UNIDADE_DE_PAGINA}/index[.]ts$` },
    },
    {
      name: 'paginas-so-pela-api-publica-do-app',
      severity: 'warn',
      comment:
        'Tela usa sessão, rotas, cliente HTTP e a faixa de demonstração só pela API pública de app/: ' +
        `app/{sessao,rotas,providers,demonstracao}/index.ts. ${LINHA_DE_BASE}`,
      from: { path: `${SRC}pages/` },
      to: {
        path: `${SRC}app/`,
        pathNot: `${SRC}app/(?:sessao|rotas|providers|demonstracao)/index[.]ts$`,
      },
    },
    {
      name: 'pagina-nao-importa-pagina',
      severity: 'error',
      comment:
        'Página não importa página: a regra captura a unidade de página da origem e proíbe qualquer ' +
        'outra pasta *Page. Na main de 09/10/2026 não há pasta *Page: só a fixture prova.',
      from: { path: `^(.*apps/web/src/pages/.*${UNIDADE_DE_PAGINA})/` },
      to: { path: `${SRC}pages/.*${UNIDADE_DE_PAGINA}/`, pathNot: '^$1/' },
    },
    {
      name: 'modulo-nao-importa-modulo',
      severity: 'error',
      comment:
        'Módulo de pages/ não importa outro módulo; o que dois módulos dividem sobe para ' +
        'pages/{components,hooks,utils,mocks}. Na main de 09/10/2026 dá 0, com pages/eventos, ' +
        'pages/estoque e pages/pessoas já existindo.',
      from: { path: `^(.*apps/web/src/pages/)${MODULOS_DE_PAGES}/` },
      to: { path: `${SRC}pages/${MODULOS_DE_PAGES}/`, pathNot: '^$1$2/' },
    },
    {
      name: 'compartilhado-nao-importa-tela',
      severity: 'error',
      comment:
        'Nível compartilhado de pages/, fora de qualquer pasta *Page, não depende de quem o consome.',
      from: { path: `${SRC}pages/`, pathNot: `${SRC}pages/.*${UNIDADE_DE_PAGINA}/` },
      to: { path: `${SRC}pages/.*${UNIDADE_DE_PAGINA}/` },
    },
    {
      name: 'compartilhado-de-pages-nao-importa-modulo',
      severity: 'error',
      comment: 'pages/{components,hooks,utils,mocks} fica acima dos módulos e não importa nenhum deles.',
      from: { path: `${SRC}pages/(components|hooks|utils|mocks)/` },
      to: { path: `${SRC}pages/${MODULOS_DE_PAGES}/` },
    },
    ...REGRAS_DE_UNIDADE_SO_PELO_INDEX,
    {
      name: 'unidade-ate-6-niveis',
      severity: 'error',
      comment:
        'Fecha a família unidade-so-pelo-index: as regras cobrem até 6 unidades aninhadas, e a ' +
        '7ª acusa cada import dela.',
      from: { path: `${SRC}.*/[A-Z].*/[A-Z].*/[A-Z].*/[A-Z].*/[A-Z].*/[A-Z].*/[A-Z][^/]*/` },
      to: { path: '.' },
    },
    {
      name: 'pasta-camel-case',
      severity: 'error',
      comment:
        'Pasta de agrupamento é minúscula e pasta de unidade é PascalCase. Pasta camelCase não é ' +
        'nenhuma das duas e escaparia da família unidade-so-pelo-index, então a regra acusa cada ' +
        'import feito por arquivo dentro dela, e pasta-camel-case-no-destino acusa cada import que ' +
        'chega nela. Nome de arquivo em camelCase segue livre. Na main 1812df6 não há pasta camelCase.',
      from: { path: PASTA_CAMEL_CASE },
      to: { path: '.' },
    },
    {
      name: 'pasta-camel-case-no-destino',
      severity: 'error',
      comment:
        'Gêmea de pasta-camel-case pelo lado do destino: pasta camelCase só com arquivos-folha, sem ' +
        'imports próprios, também é acusada quando alguém de fora importa um arquivo dela.',
      from: { path: SRC },
      to: { path: PASTA_CAMEL_CASE },
    },
    {
      name: 'producao-global-sem-mock',
      severity: 'warn',
      comment:
        `ds, lib e dados nunca leem dado de demonstração. ${LINHA_DE_BASE}`,
      from: { path: `${SRC}(ds|lib|dados)/` },
      to: { path: PASTA_DE_MOCKS },
    },
    {
      name: 'mock-global-so-dados',
      severity: 'warn',
      comment:
        `src/mocks é só dado de demonstração e depende só de lib/ e @cdd/contracts. ${LINHA_DE_BASE}`,
      from: { path: `${SRC}mocks/` },
      to: { path: [`${SRC}(app|components|dados|ds|pages|testes)/`, 'node_modules/(?!@cdd/contracts/)'] },
    },
    {
      name: 'tela-de-api-sem-mock',
      severity: 'error',
      comment:
        'Telas com fonte "api" em app/telas.ts (Acessos, Meu perfil) e o fluxo de entrada inteiro ' +
        '(EntrarPage, RetornoPage e o nível do fluxo, com constantes e components) não leem dado de ' +
        'demonstração. Cobre a pasta de hoje e a final: o fluxo final é pages/transversal/entrada/, ' +
        'que já contém as duas páginas. A lista de nomes cresce a cada tela ligada no backend nas ' +
        'etapas B1 a B6.',
      from: {
        path: [
          `${SRC}pages/(?:acessos|perfil|entrada)/`,
          `${SRC}pages/transversal/entrada/`,
          `${SRC}pages/.*/(?:AcessosPage|MeuPerfilPage)/`,
        ],
      },
      to: { path: PASTA_DE_MOCKS },
    },
    {
      name: 'apoio-de-teste-so-em-teste',
      severity: 'error',
      comment:
        'Fixtures, falsos e vitest nunca entram no bundle: só *.test.*, apoioDeTeste e src/testes ' +
        'importam src/testes, apoioDeTeste e vitest.',
      from: {
        path: SRC,
        pathNot: `[.]test[.]tsx?$|(?:^|/)apoioDeTeste[.]tsx?$|${SRC}testes/`,
      },
      to: {
        path: `(?:^|/)apoioDeTeste[.]tsx?$|${SRC}testes/|node_modules/vitest/|node_modules/@vitest/`,
      },
    },
    {
      name: 'camada-cruzada-por-alias',
      severity: 'warn',
      comment:
        'Atravessar camada, ou módulo dentro de pages/, só com o alias "@/…"; caminho relativo só ' +
        'dentro da camada ou do módulo. O alias só resolve com o tsConfig em caminho absoluto. ' +
        LINHA_DE_BASE,
      from: { path: '^(.*apps/web/src/(?:pages/[a-z]+|[a-z]+))/' },
      to: { path: SRC, pathNot: '^$1/', dependencyTypesNot: ['aliased'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: fileURLToPath(new URL('./apps/web/tsconfig.json', import.meta.url)) },
    tsPreCompilationDeps: true,
  },
};
