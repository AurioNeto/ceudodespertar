import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { OptimisticLockError } from '@mikro-orm/core';
import type { CorpoDeErro } from '@cdd/contracts';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { FiltroGlobalDeErros } from './filtro-global-de-erros.js';

interface RespostaCapturada {
  status?: number;
  corpo?: CorpoDeErro;
}

function hostFalso(capturada: RespostaCapturada): ArgumentsHost {
  const resposta = {
    status(codigo: number) {
      capturada.status = codigo;
      return resposta;
    },
    json(corpo: CorpoDeErro) {
      capturada.corpo = corpo;
    },
  };

  return {
    switchToHttp: () => ({
      getResponse: () => resposta,
      getRequest: () => ({ headers: {} }),
    }),
  } as unknown as ArgumentsHost;
}

function comCorrelacaoId<T>(correlacaoId: string, fn: () => T): T {
  return ContextoDaRequisicao.executar({ correlacaoId }, fn);
}

describe('FiltroGlobalDeErros', () => {
  let filtro: FiltroGlobalDeErros;
  let capturada: RespostaCapturada;
  let logErro: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filtro = new FiltroGlobalDeErros();
    capturada = {};
    logErro = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logErro.mockRestore();
  });

  it('erro de domínio (Result.err) responde com o status do mapa e o código', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new ErroDeDominioException(erroDeDominio('PERIODO_FECHADO', { competencia: '2026-07' })), hostFalso(capturada));
    });

    expect(capturada.status).toBe(422);
    expect(capturada.corpo).toStrictEqual({
      erro: 'PERIODO_FECHADO',
      detalhes: { competencia: '2026-07' },
      correlacaoId,
    });
  });

  it('restrição nomeada do banco (unique, com constraint) vira o código mapeado', () => {
    const correlacaoId = randomUUID();
    const violacao = Object.assign(new Error('duplicate key value violates unique constraint "usuario_email_unico"'), {
      code: '23505',
      constraint: 'usuario_email_unico',
    });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(409);
    expect(capturada.corpo).toStrictEqual({ erro: 'EMAIL_JA_CADASTRADO', correlacaoId });
  });

  it('restrição nomeada sem entrada no mapa é bug — 500 ERRO_INTERNO', () => {
    const correlacaoId = randomUUID();
    const violacao = Object.assign(new Error('duplicate key value violates unique constraint "grupo_nome_unico"'), {
      code: '23505',
      constraint: 'grupo_nome_unico',
    });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
  });

  it('P0001 com prefixo de guarda mínima é erro de programação — 500, com log de alerta', () => {
    const correlacaoId = randomUUID();
    const violacao = Object.assign(new Error('REGISTRO_IMUTAVEL: identidade.usuario não aceita UPDATE'), {
      code: 'P0001',
    });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'REGISTRO_IMUTAVEL', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('erro de banco sem mapeamento é bug — 500 ERRO_INTERNO', () => {
    const correlacaoId = randomUUID();
    const desconhecido = Object.assign(new Error('falha inesperada no banco'), { code: '55000' });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(desconhecido, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
  });

  it('OptimisticLockError do MikroORM vira 409 VERSAO_DESATUALIZADA', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(OptimisticLockError.lockFailed('Usuario'), hostFalso(capturada));
    });

    expect(capturada.status).toBe(409);
    expect(capturada.corpo).toStrictEqual({ erro: 'VERSAO_DESATUALIZADA', correlacaoId });
  });

  it('corpo inválido (CORPO_INVALIDO) responde 400 com os problemas em detalhes', () => {
    const correlacaoId = randomUUID();
    const problemas = { problemas: [{ caminho: 'nome', mensagem: 'obrigatório' }] };

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new ErroDeDominioException(erroDeDominio('CORPO_INVALIDO', problemas)), hostFalso(capturada));
    });

    expect(capturada.status).toBe(400);
    expect(capturada.corpo).toStrictEqual({ erro: 'CORPO_INVALIDO', detalhes: problemas, correlacaoId });
  });

  it('escrita em agregado existente sem If-Match vira 428 VERSAO_OBRIGATORIA', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new ErroDeDominioException(erroDeDominio('VERSAO_OBRIGATORIA')), hostFalso(capturada));
    });

    expect(capturada.status).toBe(428);
    expect(capturada.corpo).toStrictEqual({ erro: 'VERSAO_OBRIGATORIA', correlacaoId });
  });

  it('HttpException nativa do Nest (rota não encontrada) preserva o 404 como RECURSO_NAO_ENCONTRADO', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new NotFoundException(), hostFalso(capturada));
    });

    expect(capturada.status).toBe(404);
    expect(capturada.corpo).toStrictEqual({ erro: 'RECURSO_NAO_ENCONTRADO', correlacaoId });
  });

  it('HttpException nativa sem código de domínio conhecido preserva o status original com corpo genérico', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException('limite excedido', HttpStatus.TOO_MANY_REQUESTS), hostFalso(capturada));
    });

    expect(capturada.status).toBe(429);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('erro nativo, sem forma reconhecida, vira 500 ERRO_INTERNO e é logado', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new Error('algo quebrou'), hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('sem ContextoDaRequisicao ativo, gera uma correlacaoId própria em vez de quebrar', () => {
    filtro.catch(new Error('sem contexto'), hostFalso(capturada));

    expect(capturada.status).toBe(500);
    expect(typeof capturada.corpo?.correlacaoId).toBe('string');
    expect(capturada.corpo?.correlacaoId.length).toBeGreaterThan(0);
  });
});
