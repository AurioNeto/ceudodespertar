import { sql } from 'kysely';
import type { Kysely, RawBuilder } from 'kysely';
import type { DB, Json } from '../banco/banco-cdd.gerado.js';
import { JANELA_DE_RETENCAO_EM_HORAS } from './cabecalho-de-idempotencia.js';

const CODIGO_DE_VIOLACAO_DE_CHAVE_UNICA = '23505';
const STATUS_HTTP_PLACEHOLDER = 0;
const PONTO_DE_SALVAMENTO_DA_REIVINDICACAO = 'reivindicacao_de_chave_de_idempotencia';

export interface DadosDaChaveDeIdempotencia {
  readonly instituicaoId: string;
  readonly usuarioId: string | undefined;
  readonly chave: string;
  readonly rota: string;
  readonly corpoHash: string;
}

export interface ChaveDeIdempotenciaExistente {
  readonly usuarioId: string | null;
  readonly rota: string;
  readonly corpoHash: string | null;
  readonly statusHttp: number;
  readonly corpo: unknown;
  readonly location: string | null;
}

interface EnvelopeDaResposta {
  readonly corpo: unknown;
  readonly location: string | null;
}

interface LinhaDaChaveDeIdempotencia {
  readonly usuario_id: string | null;
  readonly rota: string;
  readonly corpo_hash: string | null;
  readonly status_http: number;
  readonly resposta: EnvelopeDaResposta;
  readonly vencida: boolean;
}

const RESPOSTA_PLACEHOLDER = JSON.stringify({ corpo: null, location: null } satisfies EnvelopeDaResposta);

function ehViolacaoDeChaveUnica(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    (erro as { code: unknown }).code === CODIGO_DE_VIOLACAO_DE_CHAVE_UNICA
  );
}

function envelopar(corpo: unknown, location: string | null): string {
  const envelope: EnvelopeDaResposta = { corpo: corpo ?? null, location };
  return JSON.stringify(envelope);
}

function condicaoDeVencida(): RawBuilder<boolean> {
  return sql<boolean>`criada_em < now() - make_interval(hours => ${JANELA_DE_RETENCAO_EM_HORAS})`;
}

function comoJsonb(texto: string): RawBuilder<Json> {
  return sql<Json>`${texto}::jsonb`;
}

async function inserirPlaceholder(kysely: Kysely<DB>, dados: DadosDaChaveDeIdempotencia): Promise<void> {
  await kysely
    .insertInto('shared.chave_de_idempotencia')
    .values({
      instituicao_id: dados.instituicaoId,
      chave: dados.chave,
      usuario_id: dados.usuarioId ?? null,
      rota: dados.rota,
      corpo_hash: dados.corpoHash,
      status_http: STATUS_HTTP_PLACEHOLDER,
      resposta: comoJsonb(RESPOSTA_PLACEHOLDER),
    })
    .execute();
}

async function buscarLinhaExistente(
  kysely: Kysely<DB>,
  instituicaoId: string,
  chave: string,
): Promise<LinhaDaChaveDeIdempotencia> {
  const linha = await kysely
    .selectFrom('shared.chave_de_idempotencia')
    .select([
      'usuario_id',
      'rota',
      'corpo_hash',
      'status_http',
      'resposta',
      condicaoDeVencida().as('vencida'),
    ])
    .where('instituicao_id', '=', instituicaoId)
    .where('chave', '=', chave)
    .executeTakeFirst();
  if (linha === undefined) {
    throw new Error('chave de idempotência não encontrada logo após violação de unicidade na sua inserção');
  }
  return { ...linha, resposta: linha.resposta as unknown as EnvelopeDaResposta };
}

export async function reclamarChaveVencida(kysely: Kysely<DB>, dados: DadosDaChaveDeIdempotencia): Promise<boolean> {
  const resultado = await kysely
    .updateTable('shared.chave_de_idempotencia')
    .set({
      usuario_id: dados.usuarioId ?? null,
      rota: dados.rota,
      corpo_hash: dados.corpoHash,
      status_http: STATUS_HTTP_PLACEHOLDER,
      resposta: comoJsonb(RESPOSTA_PLACEHOLDER),
      criada_em: sql<Date>`now()`,
    })
    .where('instituicao_id', '=', dados.instituicaoId)
    .where('chave', '=', dados.chave)
    .where(condicaoDeVencida())
    .executeTakeFirst();
  return resultado.numUpdatedRows > 0n;
}

function paraChaveExistente(linha: LinhaDaChaveDeIdempotencia): ChaveDeIdempotenciaExistente {
  return {
    usuarioId: linha.usuario_id,
    rota: linha.rota,
    corpoHash: linha.corpo_hash,
    statusHttp: linha.status_http,
    corpo: linha.resposta.corpo,
    location: linha.resposta.location,
  };
}

export async function reivindicarChave(
  kysely: Kysely<DB>,
  dados: DadosDaChaveDeIdempotencia,
): Promise<ChaveDeIdempotenciaExistente | undefined> {
  await sql`savepoint ${sql.raw(PONTO_DE_SALVAMENTO_DA_REIVINDICACAO)}`.execute(kysely);
  try {
    await inserirPlaceholder(kysely, dados);
    return undefined;
  } catch (erro) {
    if (!ehViolacaoDeChaveUnica(erro)) {
      throw erro;
    }
    await sql`rollback to savepoint ${sql.raw(PONTO_DE_SALVAMENTO_DA_REIVINDICACAO)}`.execute(kysely);
  }

  let linha = await buscarLinhaExistente(kysely, dados.instituicaoId, dados.chave);
  if (linha.vencida) {
    const reclamou = await reclamarChaveVencida(kysely, dados);
    if (reclamou) {
      return undefined;
    }
    linha = await buscarLinhaExistente(kysely, dados.instituicaoId, dados.chave);
  }

  return paraChaveExistente(linha);
}

export async function gravarResposta(
  kysely: Kysely<DB>,
  instituicaoId: string,
  chave: string,
  statusHttp: number,
  corpo: unknown,
  location: string | null,
): Promise<void> {
  await kysely
    .updateTable('shared.chave_de_idempotencia')
    .set({ status_http: statusHttp, resposta: comoJsonb(envelopar(corpo, location)) })
    .where('instituicao_id', '=', instituicaoId)
    .where('chave', '=', chave)
    .execute();
}
