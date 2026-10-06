import { randomUUID } from 'node:crypto';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { DriverException, OptimisticLockError } from '@mikro-orm/core';
import { DatabaseError } from 'pg';
import { CODIGOS_DE_ERRO } from '@cdd/contracts';
import type { CodigoDeErro, CorpoDeErro } from '@cdd/contracts';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { lerCorrelacaoDaRequisicao } from './correlacao-da-requisicao.js';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../kernel/erro-de-dominio.js';
import { STATUS_POR_CODIGO } from './status-por-codigo.js';
import { RESTRICAO_PARA_CODIGO } from './restricao-para-codigo.js';
import { codigoDaGuardaMinima } from './guardas-minimas-do-banco.js';

interface RespostaHttp {
  status(codigo: number): RespostaHttp;
  json(corpo: CorpoDeErro): void;
}

interface ErroDeBanco {
  readonly code: string;
  readonly constraint?: string;
  readonly message: string;
}

interface RespostaDeErro {
  readonly status: number;
  readonly corpo: CorpoDeErro;
}

const CODIGO_ERRO_INTERNO: CodigoDeErro = 'ERRO_INTERNO';
const CODIGO_VERSAO_DESATUALIZADA: CodigoDeErro = 'VERSAO_DESATUALIZADA';
const CODIGO_CORPO_GRANDE_DEMAIS: CodigoDeErro = 'CORPO_GRANDE_DEMAIS';
const CODIGO_POR_STATUS_HTTP_CONHECIDO: Readonly<Partial<Record<number, CodigoDeErro>>> = {
  400: 'CORPO_INVALIDO',
  401: 'NAO_AUTENTICADO',
  403: 'SEM_PERMISSAO',
  404: 'RECURSO_NAO_ENCONTRADO',
};
const SQLSTATE_GUARDA_MINIMA = 'P0001';
const SQLSTATES_DE_RESTRICAO_NOMEADA: ReadonlySet<string> = new Set(['23505', '23503', '23514']);
const PADRAO_SQLSTATE = /^[0-9A-Z]{5}$/;
const TIPO_DE_ERRO_CORPO_GRANDE_DEMAIS = 'entity.too.large';

function ehErroDeBanco(valor: unknown): valor is ErroDeBanco {
  if (!(valor instanceof DatabaseError) && !(valor instanceof DriverException)) return false;

  const codigo = (valor as { code?: unknown }).code;
  return typeof codigo === 'string' && PADRAO_SQLSTATE.test(codigo);
}

function ehCorpoGrandeDemais(valor: unknown): boolean {
  return typeof valor === 'object' && valor !== null && (valor as { type?: unknown }).type === TIPO_DE_ERRO_CORPO_GRANDE_DEMAIS;
}

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function ehCodigoDeErro(valor: unknown): valor is CodigoDeErro {
  return typeof valor === 'string' && (CODIGOS_DE_ERRO as readonly string[]).includes(valor);
}

function corpoDeErroDeclarado(corpo: unknown): ErroDeDominio | undefined {
  if (!ehRegistro(corpo) || !ehCodigoDeErro(corpo.erro)) return undefined;

  return erroDeDominio(corpo.erro, ehRegistro(corpo.detalhes) ? corpo.detalhes : undefined);
}

function respostaParaCodigo(
  codigo: CodigoDeErro,
  correlacaoId: string,
  detalhes?: Record<string, unknown>,
): RespostaDeErro {
  return {
    status: STATUS_POR_CODIGO[codigo],
    corpo: detalhes === undefined ? { erro: codigo, correlacaoId } : { erro: codigo, detalhes, correlacaoId },
  };
}

function respostaParaErroInterno(correlacaoId: string): RespostaDeErro {
  return respostaParaCodigo(CODIGO_ERRO_INTERNO, correlacaoId);
}

@Catch()
export class FiltroGlobalDeErros implements ExceptionFilter {
  private readonly logger = new Logger(FiltroGlobalDeErros.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contextoHttp = host.switchToHttp();
    const resposta = contextoHttp.getResponse<RespostaHttp>();
    const requisicao = typeof contextoHttp.getRequest === 'function' ? contextoHttp.getRequest<object>() : undefined;
    const correlacaoId =
      lerCorrelacaoDaRequisicao(requisicao) ?? ContextoDaRequisicao.atual()?.correlacaoId ?? randomUUID();

    const { status, corpo } = this.resolver(excecao, correlacaoId);
    resposta.status(status).json(corpo);
  }

  private resolver(excecao: unknown, correlacaoId: string): RespostaDeErro {
    if (excecao instanceof ErroDeDominioException) {
      return respostaParaCodigo(excecao.erroDeDominio.codigo, correlacaoId, excecao.erroDeDominio.detalhes);
    }

    if (excecao instanceof OptimisticLockError) {
      return respostaParaCodigo(CODIGO_VERSAO_DESATUALIZADA, correlacaoId);
    }

    if (ehCorpoGrandeDemais(excecao)) {
      this.logger.warn(`corpo da requisição excede o limite [correlacaoId=${correlacaoId}]`);
      return respostaParaCodigo(CODIGO_CORPO_GRANDE_DEMAIS, correlacaoId);
    }

    if (excecao instanceof HttpException) {
      return this.resolverHttpException(excecao, correlacaoId);
    }

    if (ehErroDeBanco(excecao)) {
      return this.resolverErroDeBanco(excecao, correlacaoId);
    }

    this.logarErroInterno('erro não mapeado chegou ao filtro global de erros', excecao, correlacaoId);
    return respostaParaErroInterno(correlacaoId);
  }

  private resolverHttpException(excecao: HttpException, correlacaoId: string): RespostaDeErro {
    const declarado = corpoDeErroDeclarado(excecao.getResponse());
    if (declarado !== undefined) {
      return respostaParaCodigo(declarado.codigo, correlacaoId, declarado.detalhes);
    }

    const status = excecao.getStatus();
    const codigo = CODIGO_POR_STATUS_HTTP_CONHECIDO[status];

    if (codigo !== undefined) {
      return respostaParaCodigo(codigo, correlacaoId);
    }

    this.logarErroInterno(`HttpException sem código de domínio conhecido: ${status} ${excecao.message}`, excecao, correlacaoId);
    return respostaParaErroInterno(correlacaoId);
  }

  private resolverErroDeBanco(erro: ErroDeBanco, correlacaoId: string): RespostaDeErro {
    if (erro.code === SQLSTATE_GUARDA_MINIMA) {
      const codigoDeGuarda = codigoDaGuardaMinima(erro.message);
      this.logarErroInterno(`guarda mínima do banco chegou à API — contorno do agregado: ${erro.message}`, erro, correlacaoId);
      return codigoDeGuarda === undefined
        ? respostaParaErroInterno(correlacaoId)
        : respostaParaCodigo(codigoDeGuarda, correlacaoId);
    }

    if (SQLSTATES_DE_RESTRICAO_NOMEADA.has(erro.code) && erro.constraint !== undefined) {
      const codigo = RESTRICAO_PARA_CODIGO[erro.constraint];
      if (codigo !== undefined) {
        return respostaParaCodigo(codigo, correlacaoId);
      }
    }

    this.logarErroInterno(`erro de banco sem mapeamento chegou à API: ${erro.code} ${erro.constraint ?? ''}`, erro, correlacaoId);
    return respostaParaErroInterno(correlacaoId);
  }

  private logarErroInterno(mensagem: string, excecao: unknown, correlacaoId: string): void {
    const stack = excecao instanceof Error ? excecao.stack : undefined;
    this.logger.error(`${mensagem} [correlacaoId=${correlacaoId}]`, stack);
  }
}
