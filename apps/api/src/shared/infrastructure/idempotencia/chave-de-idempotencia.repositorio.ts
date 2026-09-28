import type { EntityManager } from '@mikro-orm/postgresql';
import { JANELA_DE_RETENCAO_EM_HORAS } from './cabecalho-de-idempotencia.js';

const CODIGO_DE_VIOLACAO_DE_CHAVE_UNICA = '23505';
const STATUS_HTTP_PLACEHOLDER = 0;
const RESPOSTA_PLACEHOLDER = '{}';
const PONTO_DE_SALVAMENTO_DA_REIVINDICACAO = 'reivindicacao_de_chave_de_idempotencia';

export interface DadosDaChaveDeIdempotencia {
  readonly instituicaoId: string;
  readonly usuarioId: string | undefined;
  readonly chave: string;
  readonly rota: string;
  readonly corpoHash: string;
}

export interface ChaveDeIdempotenciaExistente {
  readonly rota: string;
  readonly corpoHash: string | null;
  readonly statusHttp: number;
  readonly resposta: unknown;
}

interface LinhaDaChaveDeIdempotencia {
  readonly rota: string;
  readonly corpo_hash: string | null;
  readonly status_http: number;
  readonly resposta: unknown;
  readonly vencida: boolean;
}

function ehViolacaoDeChaveUnica(erro: unknown): boolean {
  return (
    typeof erro === 'object' &&
    erro !== null &&
    'code' in erro &&
    (erro as { code: unknown }).code === CODIGO_DE_VIOLACAO_DE_CHAVE_UNICA
  );
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
    `select rota, corpo_hash, status_http, resposta,
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

async function reclamarChaveVencida(em: EntityManager, dados: DadosDaChaveDeIdempotencia): Promise<void> {
  await em.execute(
    `update shared.chave_de_idempotencia
        set usuario_id = ?, rota = ?, corpo_hash = ?, status_http = ${STATUS_HTTP_PLACEHOLDER},
            resposta = '${RESPOSTA_PLACEHOLDER}'::jsonb, criada_em = now()
      where instituicao_id = ? and chave = ?`,
    [dados.usuarioId ?? null, dados.rota, dados.corpoHash, dados.instituicaoId, dados.chave],
  );
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

  const linha = await buscarLinhaExistente(em, dados.instituicaoId, dados.chave);
  if (!linha.vencida) {
    return { rota: linha.rota, corpoHash: linha.corpo_hash, statusHttp: linha.status_http, resposta: linha.resposta };
  }

  await reclamarChaveVencida(em, dados);
  return undefined;
}

export async function gravarResposta(
  em: EntityManager,
  instituicaoId: string,
  chave: string,
  statusHttp: number,
  resposta: unknown,
): Promise<void> {
  await em.execute(
    'update shared.chave_de_idempotencia set status_http = ?, resposta = ?::jsonb where instituicao_id = ? and chave = ?',
    [statusHttp, JSON.stringify(resposta ?? null), instituicaoId, chave],
  );
}
