import type { EntityManager, QueryResult } from '@mikro-orm/postgresql';
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

async function inserirPlaceholder(em: EntityManager, dados: DadosDaChaveDeIdempotencia): Promise<void> {
  await em.execute(
    `insert into shared.chave_de_idempotencia
       (instituicao_id, chave, usuario_id, rota, corpo_hash, status_http, resposta)
     values (?, ?, ?, ?, ?, ${STATUS_HTTP_PLACEHOLDER}, '${RESPOSTA_PLACEHOLDER}'::jsonb)`,
    [dados.instituicaoId, dados.chave, dados.usuarioId ?? null, dados.rota, dados.corpoHash],
  );
}

async function buscarLinhaExistente(
  em: EntityManager,
  instituicaoId: string,
  chave: string,
): Promise<LinhaDaChaveDeIdempotencia> {
  const linhas = await em.execute<LinhaDaChaveDeIdempotencia[]>(
    `select usuario_id, rota, corpo_hash, status_http, resposta,
            criada_em < now() - make_interval(hours => ?) as vencida
       from shared.chave_de_idempotencia
      where instituicao_id = ? and chave = ?`,
    [JANELA_DE_RETENCAO_EM_HORAS, instituicaoId, chave],
  );
  const linha = linhas[0];
  if (linha === undefined) {
    throw new Error('chave de idempotência não encontrada logo após violação de unicidade na sua inserção');
  }
  return linha;
}

export async function reclamarChaveVencida(em: EntityManager, dados: DadosDaChaveDeIdempotencia): Promise<boolean> {
  const resultado = await em.execute<QueryResult>(
    `update shared.chave_de_idempotencia
        set usuario_id = ?, rota = ?, corpo_hash = ?, status_http = ${STATUS_HTTP_PLACEHOLDER},
            resposta = ?::jsonb, criada_em = now()
      where instituicao_id = ? and chave = ?
        and criada_em < now() - make_interval(hours => ?)`,
    [
      dados.usuarioId ?? null,
      dados.rota,
      dados.corpoHash,
      RESPOSTA_PLACEHOLDER,
      dados.instituicaoId,
      dados.chave,
      JANELA_DE_RETENCAO_EM_HORAS,
    ],
    'run',
  );
  return resultado.affectedRows > 0;
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
  em: EntityManager,
  dados: DadosDaChaveDeIdempotencia,
): Promise<ChaveDeIdempotenciaExistente | undefined> {
  await em.execute(`savepoint ${PONTO_DE_SALVAMENTO_DA_REIVINDICACAO}`);
  try {
    await inserirPlaceholder(em, dados);
    return undefined;
  } catch (erro) {
    if (!ehViolacaoDeChaveUnica(erro)) {
      throw erro;
    }
    await em.execute(`rollback to savepoint ${PONTO_DE_SALVAMENTO_DA_REIVINDICACAO}`);
  }

  let linha = await buscarLinhaExistente(em, dados.instituicaoId, dados.chave);
  if (linha.vencida) {
    const reclamou = await reclamarChaveVencida(em, dados);
    if (reclamou) {
      return undefined;
    }
    linha = await buscarLinhaExistente(em, dados.instituicaoId, dados.chave);
  }

  return paraChaveExistente(linha);
}

export async function gravarResposta(
  em: EntityManager,
  instituicaoId: string,
  chave: string,
  statusHttp: number,
  corpo: unknown,
  location: string | null,
): Promise<void> {
  await em.execute(
    'update shared.chave_de_idempotencia set status_http = ?, resposta = ?::jsonb where instituicao_id = ? and chave = ?',
    [statusHttp, envelopar(corpo, location), instituicaoId, chave],
  );
}
