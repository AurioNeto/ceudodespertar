import { Injectable, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { lastValueFrom, of } from 'rxjs';
import type { EntityManager } from '@mikro-orm/postgresql';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA, chaveDeIdempotenciaEhValida } from './cabecalho-de-idempotencia.js';
import { calcularHashDoCorpo } from './hash-do-corpo.js';
import { erroDeChaveDeIdempotenciaReutilizada } from './erro-de-chave-de-idempotencia-reutilizada.js';
import { erroDeChaveDeIdempotenciaInvalida } from './erro-de-chave-de-idempotencia-invalida.js';
import { ErroDeConfiguracaoDeIdempotencia } from './erro-de-configuracao-de-idempotencia.js';
import { gravarResposta, reivindicarChave } from './chave-de-idempotencia.repositorio.js';
import type { DadosDaChaveDeIdempotencia } from './chave-de-idempotencia.repositorio.js';

const METODO_QUE_ACEITA_IDEMPOTENCIA = 'POST';
const NOME_DO_CABECALHO_DE_LOCALIZACAO = 'Location';
const MENSAGEM_DE_CONTEXTO_AUSENTE =
  'Idempotency-Key recebida sem instituição no contexto da requisição — a ordem dos interceptors globais ' +
  'está errada (a borda transacional precisa rodar antes da idempotência) ou a requisição chegou sem identidade';
const MENSAGEM_DE_RESPOSTA_PROPRIA_DO_HANDLER =
  'Idempotency-Key recebida numa rota cujo handler respondeu por conta própria (@Res sem passthrough) — ' +
  'a idempotência não sabe capturar corpo/status desse tipo de resposta e não gravou a chave';

interface RequisicaoDeIdempotencia {
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, unknown>;
  readonly body: unknown;
  header(nome: string): string | undefined;
}

interface RespostaDeIdempotencia {
  statusCode: number;
  readonly headersSent: boolean;
  getHeader(nome: string): string | undefined;
  setHeader(nome: string, valor: string): void;
}

function normalizarQueryString(query: Record<string, unknown>): string {
  const partes: string[] = [];
  for (const chave of Object.keys(query).toSorted()) {
    const valores = Array.isArray(query[chave]) ? (query[chave] as unknown[]) : [query[chave]];
    for (const valor of valores) {
      partes.push(`${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
    }
  }
  return partes.length > 0 ? `?${partes.join('&')}` : '';
}

function construirRotaDaRequisicao(requisicao: RequisicaoDeIdempotencia): string {
  return `${requisicao.method} ${requisicao.path}${normalizarQueryString(requisicao.query)}`;
}

@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotenciaInterceptor.name);

  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  async intercept(contexto: ExecutionContext, proximo: CallHandler): Promise<Observable<unknown>> {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoDeIdempotencia>();
    const chave = requisicao.header(NOME_DO_CABECALHO_DE_IDEMPOTENCIA);

    if (chave === undefined || requisicao.method !== METODO_QUE_ACEITA_IDEMPOTENCIA) {
      return proximo.handle();
    }

    const identidade = ContextoDaRequisicao.atual();

    if (!chaveDeIdempotenciaEhValida(chave)) {
      throw erroDeChaveDeIdempotenciaInvalida(identidade?.correlacaoId);
    }

    if (identidade?.instituicaoId === undefined) {
      this.logger.error(MENSAGEM_DE_CONTEXTO_AUSENTE);
      throw new ErroDeConfiguracaoDeIdempotencia(MENSAGEM_DE_CONTEXTO_AUSENTE);
    }

    const resposta = contexto.switchToHttp().getResponse<RespostaDeIdempotencia>();
    const dados: DadosDaChaveDeIdempotencia = {
      instituicaoId: identidade.instituicaoId,
      usuarioId: identidade.usuarioId,
      chave,
      rota: construirRotaDaRequisicao(requisicao),
      corpoHash: calcularHashDoCorpo(requisicao.body),
    };

    const corpoDaResposta = await this.unidadeDeTrabalho.transacao('escrita', ({ em }) =>
      this.executarComIdempotencia(em, dados, resposta, identidade.correlacaoId, () =>
        lastValueFrom(proximo.handle(), { defaultValue: undefined }),
      ),
    );

    return of(corpoDaResposta);
  }

  private async executarComIdempotencia(
    em: EntityManager,
    dados: DadosDaChaveDeIdempotencia,
    resposta: RespostaDeIdempotencia,
    correlacaoId: string | undefined,
    executarComando: () => Promise<unknown>,
  ): Promise<unknown> {
    const existente = await reivindicarChave(em, dados);

    if (existente !== undefined) {
      const usuarioBate = (existente.usuarioId ?? undefined) === (dados.usuarioId ?? undefined);
      if (!usuarioBate || existente.rota !== dados.rota || existente.corpoHash !== dados.corpoHash) {
        throw erroDeChaveDeIdempotenciaReutilizada(correlacaoId);
      }
      resposta.statusCode = existente.statusHttp;
      if (existente.location !== null) {
        resposta.setHeader(NOME_DO_CABECALHO_DE_LOCALIZACAO, existente.location);
      }
      return existente.corpo;
    }

    const corpo = await executarComando();

    if (resposta.headersSent) {
      this.logger.error(MENSAGEM_DE_RESPOSTA_PROPRIA_DO_HANDLER);
      throw new ErroDeConfiguracaoDeIdempotencia(MENSAGEM_DE_RESPOSTA_PROPRIA_DO_HANDLER);
    }

    const location = resposta.getHeader(NOME_DO_CABECALHO_DE_LOCALIZACAO) ?? null;
    await gravarResposta(em, dados.instituicaoId, dados.chave, resposta.statusCode, corpo, location);
    return corpo;
  }
}
