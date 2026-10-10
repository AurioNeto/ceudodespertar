import type { CategoriaDeAchado, RegraViolada } from './detector-de-escrita.js';

export interface CasoDeFixture {
  readonly caso: string;
  readonly violacoes: readonly string[];
  readonly achados?: readonly string[];
}

export function esperar(arquivo: string, regra: RegraViolada, ...simbolos: readonly string[]): readonly string[] {
  return simbolos.map((simbolo) => `${arquivo}|${regra}|${simbolo}`);
}

export function achar(categoria: CategoriaDeAchado, ...simbolos: readonly string[]): readonly string[] {
  return simbolos.map((simbolo) => `${categoria}:${simbolo}`);
}

export const CASOS_POSITIVOS: readonly CasoDeFixture[] = [
  {
    caso: 'application-kysely-insert-into',
    violacoes: esperar('modules/m/application/gravar.ts', 'fora-da-persistencia', 'insertInto', 'values', 'execute'),
  },
  {
    caso: 'application-alias',
    violacoes: esperar('modules/m/application/alias.ts', 'fora-da-persistencia', 'insertInto', 'sql'),
  },
  {
    caso: 'application-select-from',
    violacoes: esperar('modules/m/application/ler.ts', 'fora-da-persistencia', 'selectFrom', 'selectAll', 'execute'),
  },
  {
    caso: 'application-desestruturacao',
    violacoes: esperar('modules/m/application/desestruturar.ts', 'fora-da-persistencia', 'insertInto'),
  },
  {
    caso: 'application-em-create',
    violacoes: esperar('modules/m/application/criar.ts', 'fora-da-persistencia', 'create'),
  },
  {
    caso: 'application-em-execute',
    violacoes: esperar('modules/m/application/executar.ts', 'fora-da-persistencia', 'execute'),
  },
  {
    caso: 'application-fork',
    violacoes: esperar('modules/m/application/bifurcar.ts', 'fora-da-persistencia', 'fork'),
  },
  {
    caso: 'application-as-any',
    violacoes: esperar('modules/m/application/qualquer.ts', 'fora-da-persistencia', 'as any'),
  },
  {
    caso: 'application-por-indice',
    violacoes: esperar('modules/m/application/indice.ts', 'fora-da-persistencia', 'nativeDelete'),
  },
  {
    caso: 'interface-native-delete',
    violacoes: esperar('modules/m/interface/http/apagar.controller.ts', 'fora-da-persistencia', 'nativeDelete'),
  },
  {
    caso: 'infraestrutura-set-config',
    violacoes: esperar('modules/m/infrastructure/ajustar.ts', 'set-config-restrito', 'set-config', 'set-config', 'set'),
  },
  {
    caso: 'infraestrutura-fork-e-transacao',
    violacoes: esperar(
      'modules/m/infrastructure/transacao.ts',
      'so-no-banco',
      'fork',
      'transactional',
      'begin',
      'commit',
      'rollback',
    ),
  },
  {
    caso: 'infraestrutura-sql-indeterminado',
    violacoes: esperar('modules/m/infrastructure/indeterminado.ts', 'sql-indeterminado', 'execute', 'raw'),
  },
  {
    caso: 'infraestrutura-sql-em-variavel-mutavel',
    violacoes: esperar('modules/m/infrastructure/variavel.ts', 'sql-indeterminado', 'execute'),
  },
  {
    caso: 'leitor-kysely-insert-into',
    violacoes: esperar('modules/m/infrastructure/leitor-x.kysely.ts', 'leitura-fora-da-allowlist', 'insertInto', 'values'),
  },
  {
    caso: 'leitor-em-escrita-implicita',
    violacoes: esperar(
      'modules/m/infrastructure/leitor-y.ts',
      'leitura-fora-da-allowlist',
      'create',
      'assign',
      'persist',
      'flush',
    ),
  },
  {
    caso: 'consultas-em-execute-de-escrita',
    violacoes: esperar(
      'modules/m/infrastructure/consultas-z.ts',
      'leitura-fora-da-allowlist',
      'sql:escrita',
      'sql:escrita',
    ),
  },
  {
    caso: 'rota-http-adapter',
    violacoes: esperar('modules/m/interface/http/rota.ts', 'rota-fora-do-nest', 'post', 'get', 'delete'),
  },
  {
    caso: 'rota-use-fora-da-excecao',
    violacoes: esperar('composicao/outra.ts', 'rota-fora-do-nest', 'use'),
  },
  {
    caso: 'raw-escrita-em-leitor',
    violacoes: esperar(
      'modules/m/infrastructure/leitor-r.kysely.ts',
      'leitura-fora-da-allowlist',
      'sql:escrita',
      'sql:escrita',
      'sql:controle',
    ).concat(esperar('modules/m/infrastructure/leitor-r.kysely.ts', 'sql-indeterminado', 'sql')),
  },
  {
    caso: 'raw-ajusta-sessao-fora-do-banco',
    violacoes: esperar('modules/m/infrastructure/sessao.ts', 'set-config-restrito', 'set', 'set', 'set'),
  },
  {
    caso: 'instancia-do-servidor-http',
    violacoes: esperar('modules/m/interface/http/instancia.ts', 'rota-fora-do-nest', 'getInstance', 'getInstance'),
  },
  {
    caso: 'adaptador-express-instanciado',
    violacoes: esperar('modules/m/interface/http/express.ts', 'rota-fora-do-nest', 'get', 'use'),
  },
  {
    caso: 'rota-use-com-caminho-na-excecao',
    violacoes: esperar('composicao/aplicacao.ts', 'rota-fora-do-nest', 'use'),
  },
];

export const CASOS_NEGATIVOS: readonly CasoDeFixture[] = [
  {
    caso: 'repositorio-escrevendo-na-persistencia',
    violacoes: [],
    achados: achar('escrita', 'create', 'assign', 'persist', 'flush', 'insertInto', 'sql:execute'),
  },
  { caso: 'leitor-so-com-select', violacoes: [] },
  { caso: 'classe-propria-com-membros-homonimos', violacoes: [] },
  { caso: 'fork-e-sessao-no-banco', violacoes: [], achados: achar('set-config', 'set-config', 'set') },
  { caso: 'set-config-no-despachante', violacoes: [], achados: achar('set-config', 'set-config', 'set') },
  { caso: 'consulta-de-di-nao-e-rota', violacoes: [], achados: achar('rota-fora-do-nest', 'use') },
  { caso: 'application-passa-contexto-adiante', violacoes: [] },
  { caso: 'controle-de-transacao-em-sql', violacoes: [] },
  { caso: 'http-adapter-sem-caminho', violacoes: [] },
];
