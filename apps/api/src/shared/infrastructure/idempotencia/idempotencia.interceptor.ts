import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/internal';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { lastValueFrom, of } from 'rxjs';
import type { EntityManager } from '@mikro-orm/postgresql';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { UnidadeDeTrabalho } from '../banco/unidade-de-trabalho.js';
import { NOME_DO_CABECALHO_DE_IDEMPOTENCIA } from './cabecalho-de-idempotencia.js';
import { calcularHashDoCorpo } from './hash-do-corpo.js';
import { erroDeChaveDeIdempotenciaReutilizada } from './erro-de-chave-de-idempotencia-reutilizada.js';
import { gravarResposta, reivindicarChave } from './chave-de-idempotencia.repositorio.js';
import type { DadosDaChaveDeIdempotencia } from './chave-de-idempotencia.repositorio.js';

const METODO_QUE_ACEITA_IDEMPOTENCIA = 'POST';
const STATUS_HTTP_PADRAO_DE_CRIACAO = 201;
const STATUS_HTTP_PADRAO_GERAL = 200;

interface RequisicaoDeIdempotencia {
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly route?: { readonly path?: string };
  header(nome: string): string | undefined;
}

function construirRotaDaRequisicao(requisicao: RequisicaoDeIdempotencia): string {
  const caminho = requisicao.route?.path ?? requisicao.path;
  return `${requisicao.method} ${caminho}`;
}

function statusHttpPadraoPorMetodo(metodo: string): number {
  return metodo === METODO_QUE_ACEITA_IDEMPOTENCIA ? STATUS_HTTP_PADRAO_DE_CRIACAO : STATUS_HTTP_PADRAO_GERAL;
}

@Injectable()
export class IdempotenciaInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
  ) {}

  async intercept(contexto: ExecutionContext, proximo: CallHandler): Promise<Observable<unknown>> {
    const requisicao = contexto.switchToHttp().getRequest<RequisicaoDeIdempotencia>();
    const chave = requisicao.header(NOME_DO_CABECALHO_DE_IDEMPOTENCIA);
    const identidade = ContextoDaRequisicao.atual();
    const instituicaoId = identidade?.instituicaoId;

    if (chave === undefined || instituicaoId === undefined || requisicao.method !== METODO_QUE_ACEITA_IDEMPOTENCIA) {
      return proximo.handle();
    }

    const dados: DadosDaChaveDeIdempotencia = {
      instituicaoId,
      usuarioId: identidade?.usuarioId,
      chave,
      rota: construirRotaDaRequisicao(requisicao),
      corpoHash: calcularHashDoCorpo(requisicao.body),
    };
    const statusHttpDaCriacao =
      this.reflector.get<number | undefined>(HTTP_CODE_METADATA, contexto.getHandler()) ??
      statusHttpPadraoPorMetodo(requisicao.method);

    const resposta = await this.unidadeDeTrabalho.transacao('leitura', ({ em }) =>
      this.executarComIdempotencia(em, dados, statusHttpDaCriacao, identidade?.correlacaoId, () =>
        lastValueFrom(proximo.handle(), { defaultValue: undefined }),
      ),
    );

    return of(resposta);
  }

  private async executarComIdempotencia(
    em: EntityManager,
    dados: DadosDaChaveDeIdempotencia,
    statusHttpDaCriacao: number,
    correlacaoId: string | undefined,
    executarComando: () => Promise<unknown>,
  ): Promise<unknown> {
    const existente = await reivindicarChave(em, dados);

    if (existente !== undefined) {
      if (existente.rota !== dados.rota || existente.corpoHash !== dados.corpoHash) {
        throw erroDeChaveDeIdempotenciaReutilizada(correlacaoId);
      }
      return existente.resposta;
    }

    const resultado = await executarComando();
    await gravarResposta(em, dados.instituicaoId, dados.chave, statusHttpDaCriacao, resultado);
    return resultado;
  }
}
