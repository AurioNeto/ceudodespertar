export type ZonaDoArquivo = 'fora' | 'persistencia' | 'leitura';

const PASTAS_DE_PERSISTENCIA: readonly RegExp[] = [
  /^modules\/[^/]+\/infrastructure\//,
  /^shared\/infrastructure\/(banco|eventos|idempotencia)\//,
  /^banco\//,
];

const PADRAO_DE_ARQUIVO_DE_LEITURA = /(^|\/)(leitor|consultas)-[^/]*$/;

export function zonaDoArquivo(caminhoRelativoASrc: string): ZonaDoArquivo {
  if (!PASTAS_DE_PERSISTENCIA.some((pasta) => pasta.test(caminhoRelativoASrc))) return 'fora';
  return PADRAO_DE_ARQUIVO_DE_LEITURA.test(caminhoRelativoASrc) ? 'leitura' : 'persistencia';
}

export const PASTA_DO_BANCO = 'shared/infrastructure/banco/';

export type MotivoNomeado = `${string}-${string}`;

const FORMATO_DE_MOTIVO = /^[a-z0-9]+(-[a-z0-9]+)+$/;

export function exigirMotivos<T extends Readonly<Record<string, MotivoNomeado>>>(tabela: T): T {
  const semMotivo = Object.entries(tabela).filter(([, motivo]) => !FORMATO_DE_MOTIVO.test(motivo));
  if (semMotivo.length > 0) {
    throw new Error(`entradas sem motivo nomeado: ${semMotivo.map(([chave]) => chave).join(', ')}`);
  }
  return tabela;
}

export function exigirMotivosPorMembro<T extends Readonly<Record<string, Readonly<Record<string, MotivoNomeado>>>>>(
  tabela: T,
): T {
  for (const membros of Object.values(tabela)) exigirMotivos(membros);
  return tabela;
}

export const ARQUIVOS_QUE_PODEM_AJUSTAR_A_SESSAO = exigirMotivos({
  'shared/infrastructure/eventos/despachante.ts': 'ajusta-a-sessao-da-transacao-do-evento',
});

export const ARQUIVOS_QUE_ENCERRAM_TRANSACAO_EM_SQL_CRU = exigirMotivos({
  'shared/infrastructure/eventos/despachante.ts': 'encerra-a-transacao-e-bloqueia-escrita-avulsa',
});

export const MEMBROS_SO_DO_BANCO: ReadonlySet<string> = new Set([
  'fork',
  'transactional',
  'begin',
  'commit',
  'rollback',
  'transaction',
  'startTransaction',
]);

export const MEMBROS_DE_ESCRITA: ReadonlySet<string> = new Set([
  'insertInto',
  'updateTable',
  'deleteFrom',
  'mergeInto',
  'replaceInto',
  'persist',
  'persistAndFlush',
  'flush',
  'remove',
  'removeAndFlush',
  'insert',
  'insertMany',
  'upsert',
  'upsertMany',
  'nativeInsert',
  'nativeInsertMany',
  'nativeUpdate',
  'nativeDelete',
  'create',
  'assign',
  'merge',
]);

export const MEMBROS_DE_LEITURA: ReadonlySet<string> = new Set([
  'sql',
  'raw',
  'lit',
  'selectFrom',
  'select',
  'selectAll',
  'distinct',
  'distinctOn',
  'innerJoin',
  'leftJoin',
  'rightJoin',
  'fullJoin',
  'crossJoin',
  'innerJoinLateral',
  'leftJoinLateral',
  'on',
  'onRef',
  'onTrue',
  'where',
  'whereRef',
  'having',
  'havingRef',
  'orderBy',
  'groupBy',
  'limit',
  'offset',
  'with',
  'withRecursive',
  'withSchema',
  'as',
  'fn',
  'ref',
  'val',
  'eb',
  'and',
  'or',
  'not',
  'exists',
  'case',
  'when',
  'then',
  'else',
  'end',
  'count',
  'countAll',
  'sum',
  'avg',
  'min',
  'max',
  'coalesce',
  'union',
  'unionAll',
  'intersect',
  'except',
  '$if',
  '$call',
  'execute',
  'executeTakeFirst',
  'executeTakeFirstOrThrow',
  'stream',
  'compile',
  'find',
  'findOne',
  'findOneOrFail',
  'findAll',
  'findAndCount',
  'findByCursor',
  'getReference',
]);

export const EXCECOES_DE_SQL_INDETERMINADO = exigirMotivos<Readonly<Record<string, MotivoNomeado>>>({});

export const EXCECOES_DE_ROTA_FORA_DO_NEST = exigirMotivosPorMembro({
  'composicao/aplicacao.ts': { use: 'registra-middleware-global-sem-caminho' },
} as const);
