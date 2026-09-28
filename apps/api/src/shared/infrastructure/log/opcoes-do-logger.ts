import { hostname } from 'node:os';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { stdTimeFunctions } from 'pino';
import type { DestinationStream, LoggerOptions } from 'pino';
import type { Options as OpcoesDoPinoHttp } from 'pino-http';
import type { Params } from 'nestjs-pino';
import type { Ambiente } from '../configuracao/esquema-de-ambiente.js';
import { correlacaoDaRequisicao } from './correlacao.js';
import { redigirLinhaDeLog } from './redacao.js';

export const NOME_DO_SERVICO = 'cdd-api';
export const CHAVE_DA_CORRELACAO_NO_LOG = 'correlacaoId';
export const PREFIXO_DAS_SONDAS_DE_SAUDE = '/saude/';

type NivelDeLog = Ambiente['LOG_NIVEL'];

interface RequisicaoSerializada {
  readonly method?: string;
  readonly url?: string;
  readonly headers?: Record<string, unknown>;
}

interface RespostaSerializada {
  readonly statusCode?: number;
  readonly headers?: Record<string, unknown>;
}

function semQueryString(url: string | undefined): string | undefined {
  return url?.split('?', 1)[0];
}

export function serializarRequisicao(requisicao: RequisicaoSerializada): Record<string, unknown> {
  return {
    method: requisicao.method,
    url: semQueryString(requisicao.url),
    headers: requisicao.headers,
  };
}

export function serializarResposta(resposta: RespostaSerializada): Record<string, unknown> {
  return {
    statusCode: resposta.statusCode,
    headers: resposta.headers,
  };
}

export function construirOpcoesDoPino(nivel: NivelDeLog): LoggerOptions {
  return {
    level: nivel,
    base: { servico: NOME_DO_SERVICO, pid: process.pid, hostname: hostname() },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      level: (rotulo) => ({ level: rotulo }),
    },
    hooks: { streamWrite: redigirLinhaDeLog },
    serializers: {
      req: serializarRequisicao,
      res: serializarResposta,
    },
  };
}

function ehSondaDeSaude(requisicao: IncomingMessage): boolean {
  return requisicao.url?.startsWith(PREFIXO_DAS_SONDAS_DE_SAUDE) ?? false;
}

function nivelDaRequisicaoConcluida(
  _requisicao: IncomingMessage,
  resposta: ServerResponse,
  erro?: Error,
): 'error' | 'warn' | 'info' {
  if (erro !== undefined || resposta.statusCode >= 500) {
    return 'error';
  }
  return resposta.statusCode >= 400 ? 'warn' : 'info';
}

export function construirOpcoesDoPinoHttp(nivel: NivelDeLog): OpcoesDoPinoHttp {
  return {
    ...construirOpcoesDoPino(nivel),
    genReqId: correlacaoDaRequisicao,
    customAttributeKeys: { reqId: CHAVE_DA_CORRELACAO_NO_LOG },
    quietReqLogger: true,
    customLogLevel: nivelDaRequisicaoConcluida,
    autoLogging: { ignore: ehSondaDeSaude },
  };
}

export function construirParametrosDoLogger(nivel: NivelDeLog, destino?: DestinationStream): Params {
  const opcoes = construirOpcoesDoPinoHttp(nivel);
  return { pinoHttp: destino === undefined ? opcoes : [opcoes, destino] };
}
