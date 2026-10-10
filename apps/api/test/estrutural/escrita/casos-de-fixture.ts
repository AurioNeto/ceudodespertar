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
      'sql:transacao',
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
  {
    caso: 'multiplas-instrucoes',
    violacoes: esperar('modules/m/infrastructure/leitor-s.kysely.ts', 'leitura-fora-da-allowlist', 'sql:escrita'),
  },
  {
    caso: 'raw-executado-por-indireto',
    violacoes: esperar(
      'modules/m/infrastructure/leitor-q.kysely.ts',
      'leitura-fora-da-allowlist',
      'sql:transacao',
      'sql:transacao',
    ).concat(esperar('modules/m/infrastructure/leitor-q.kysely.ts', 'sql-indeterminado', 'sql', 'sql')),
  },
  {
    caso: 'raw-sessao-em-fragmento',
    violacoes: esperar('modules/m/infrastructure/fragmento.ts', 'set-config-restrito', 'set', 'set'),
  },
  {
    caso: 'servidor-http-por-desestruturacao',
    violacoes: esperar(
      'modules/m/interface/http/servidor.ts',
      'rota-fora-do-nest',
      'getHttpServer',
      'getInstance',
      'getInstance',
      'getInstance',
    ),
  },
  {
    caso: 'transacao-completa-em-sql-fora-do-banco',
    violacoes: esperar(
      'modules/m/infrastructure/transacao-sql.ts',
      'so-no-banco',
      ...Array<string>(8).fill('sql:transacao'),
    ),
  },
  {
    caso: 'transacao-completa-em-sql-no-mikro-orm',
    violacoes: esperar('modules/m/infrastructure/encerrar.ts', 'so-no-banco', 'sql:transacao', 'sql:transacao', 'sql:transacao').concat(
      esperar('modules/m/infrastructure/encerrar.ts', 'set-config-restrito', 'set'),
    ),
  },
  {
    caso: 'transacao-em-leitor-com-ponto-de-salvamento',
    violacoes: esperar(
      'modules/m/infrastructure/leitor-t.kysely.ts',
      'leitura-fora-da-allowlist',
      'sql:controle',
      'sql:controle',
      'sql:controle',
      'sql:transacao',
      'sql:transacao',
    ),
  },
  {
    caso: 'instrucao-seguinte-comeca-com-interpolacao',
    violacoes: esperar('modules/m/infrastructure/leitor-p.kysely.ts', 'sql-indeterminado', 'sql', 'sql', 'sql'),
  },
  {
    caso: 'aspas-com-marca-de-comentario',
    violacoes: esperar(
      'modules/m/infrastructure/leitor-a.kysely.ts',
      'leitura-fora-da-allowlist',
      'sql:escrita',
      'sql:escrita',
      'sql:escrita',
    ).concat(esperar('modules/m/infrastructure/leitor-a.kysely.ts', 'sql-indeterminado', 'sql')),
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
  { caso: 'template-com-interpolacao-nao-executado', violacoes: [] },
  { caso: 'ponto-de-salvamento-fora-do-banco', violacoes: [] },
  { caso: 'transacao-no-despachante', violacoes: [], achados: achar('transacao-em-sql', 'transacao', 'transacao') },
  { caso: 'transacao-no-banco', violacoes: [], achados: achar('transacao-em-sql', 'transacao', 'transacao', 'transacao') },
];
