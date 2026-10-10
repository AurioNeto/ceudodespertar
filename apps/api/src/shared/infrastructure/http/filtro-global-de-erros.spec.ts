import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { CorpoDeErro } from '@cdd/contracts';
import { ContextoDaRequisicao } from '../contexto-da-requisicao.js';
import { erroDeDominio, ErroDeDominioException } from '../../kernel/erro-de-dominio.js';
import { erroDeVersaoDesatualizada, erroDoDriverComSqlstate, erroDoPgComSqlstate } from '../banco/erros-de-banco.fake.js';
import { gravarCorrelacaoNaRequisicao } from './correlacao-da-requisicao.js';
import { FiltroGlobalDeErros } from './filtro-global-de-erros.js';

function violacaoDeRestricao(mensagem: string, constraint: string): Error {
  return erroDoPgComSqlstate(mensagem, '23505', constraint);
}

interface RespostaCapturada {
  status?: number;
  corpo?: CorpoDeErro;
  cabecalhos?: Record<string, string>;
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
    setHeader(nome: string, valor: string) {
      capturada.cabecalhos = { ...capturada.cabecalhos, [nome]: valor };
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

  it('toda resposta 401 leva o desafio Bearer, inclusive a recusa por situação do usuário vinda do handler', () => {
    comCorrelacaoId(randomUUID(), () => {
      filtro.catch(new ErroDeDominioException(erroDeDominio('USUARIO_SUSPENSO')), hostFalso(capturada));
    });

    expect(capturada.status).toBe(401);
    expect(capturada.cabecalhos).toStrictEqual({ 'WWW-Authenticate': 'Bearer' });
  });

  it('resposta que não é 401 não leva desafio de autenticação', () => {
    comCorrelacaoId(randomUUID(), () => {
      filtro.catch(new ErroDeDominioException(erroDeDominio('PERIODO_FECHADO')), hostFalso(capturada));
    });

    expect(capturada.status).toBe(422);
    expect(capturada.cabecalhos).toBeUndefined();
  });

  it('429 de domínio leva Retry-After em segundos inteiros a partir do dado do erro', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(
        new ErroDeDominioException(erroDeDominio('CONVITE_REENVIADO_RECENTEMENTE', { retryAfterSegundos: 42 })),
        hostFalso(capturada),
      );
    });

    expect(capturada.status).toBe(429);
    expect(capturada.cabecalhos).toStrictEqual({ 'Retry-After': '42' });
    expect(capturada.corpo).toStrictEqual({
      erro: 'CONVITE_REENVIADO_RECENTEMENTE',
      detalhes: { retryAfterSegundos: 42 },
      correlacaoId,
    });
  });

  it.each([[undefined], [{}], [{ retryAfterSegundos: 0 }], [{ retryAfterSegundos: 1.5 }], [{ retryAfterSegundos: '30' }]])(
    '429 sem espera válida (%j) não emite Retry-After',
    (detalhes) => {
      comCorrelacaoId(randomUUID(), () => {
        filtro.catch(
          new ErroDeDominioException(erroDeDominio('CONVITE_REENVIADO_RECENTEMENTE', detalhes)),
          hostFalso(capturada),
        );
      });

      expect(capturada.status).toBe(429);
      expect(capturada.cabecalhos).toBeUndefined();
    },
  );

  it('só o 429 emite Retry-After, mesmo com o dado presente', () => {
    comCorrelacaoId(randomUUID(), () => {
      filtro.catch(
        new ErroDeDominioException(erroDeDominio('PERIODO_FECHADO', { retryAfterSegundos: 42 })),
        hostFalso(capturada),
      );
    });

    expect(capturada.cabecalhos).toBeUndefined();
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
    const violacao = violacaoDeRestricao(
      'duplicate key value violates unique constraint "usuario_email_unico"',
      'usuario_email_unico',
    );

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(409);
    expect(capturada.corpo).toStrictEqual({ erro: 'EMAIL_JA_CADASTRADO', correlacaoId });
  });

  it('a mesma violação, vinda de uma DriverException do MikroORM, também vira o código mapeado', () => {
    const correlacaoId = randomUUID();
    const violacao = erroDoDriverComSqlstate(
      'duplicate key value violates unique constraint "usuario_email_unico"',
      '23505',
      'usuario_email_unico',
    );

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(409);
    expect(capturada.corpo).toStrictEqual({ erro: 'EMAIL_JA_CADASTRADO', correlacaoId });
  });

  it('restrição nomeada sem entrada no mapa é bug — 500 ERRO_INTERNO', () => {
    const correlacaoId = randomUUID();
    const violacao = violacaoDeRestricao(
      'duplicate key value violates unique constraint "grupo_nome_unico_inexistente"',
      'grupo_nome_unico_inexistente',
    );

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
  });

  it('P0001 com prefixo de guarda mínima é erro de programação — 500, com log de alerta', () => {
    const correlacaoId = randomUUID();
    const violacao = erroDoPgComSqlstate('REGISTRO_IMUTAVEL: identidade.usuario não aceita UPDATE', 'P0001');

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(violacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'REGISTRO_IMUTAVEL', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('erro de banco sem mapeamento é bug — 500 ERRO_INTERNO', () => {
    const correlacaoId = randomUUID();
    const desconhecido = erroDoPgComSqlstate('falha inesperada no banco', '55000');

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(desconhecido, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
  });

  it('um erro que só imita o formato de erro de banco (não é instância do pg nem do MikroORM) não é tratado como restrição — cai no ramo genérico', () => {
    const correlacaoId = randomUUID();
    const imitacao = Object.assign(new Error('duplicate key value violates unique constraint "usuario_email_unico"'), {
      code: '23505',
      constraint: 'usuario_email_unico',
    });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(imitacao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('ECONNREFUSED e afins (sem SQLSTATE de 5 caracteres) vão para o ramo genérico, nunca para o de restrição', () => {
    const correlacaoId = randomUUID();
    const semConexao = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), { code: 'ECONNREFUSED' });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(semConexao, hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
    expect(logErro).toHaveBeenCalledWith(expect.stringContaining(correlacaoId), semConexao.stack);
  });

  it('corpo maior que o limite (PayloadTooLargeError do body-parser) vira 413 CORPO_GRANDE_DEMAIS, logado como aviso e sem stack', () => {
    const correlacaoId = randomUUID();
    const logAviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const corpoGrande = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
      type: 'entity.too.large',
    });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(corpoGrande, hostFalso(capturada));
    });

    expect(capturada.status).toBe(413);
    expect(capturada.corpo).toStrictEqual({ erro: 'CORPO_GRANDE_DEMAIS', correlacaoId });
    expect(logAviso).toHaveBeenCalledWith(expect.stringContaining(correlacaoId));
    expect(logErro).not.toHaveBeenCalled();
    logAviso.mockRestore();
  });

  it.each([
    ['status', 'encoding.unsupported', 415],
    ['statusCode', 'entity.parse.failed', 400],
    ['status', 'request.aborted', 400],
  ] as const)('erro do body-parser (%s %i, type %s) vira 400 CORPO_INVALIDO, logado como aviso e sem stack', (campo, tipo, statusDoErro) => {
    const correlacaoId = randomUUID();
    const logAviso = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const erroDoParser = Object.assign(new SyntaxError('Unexpected token'), { [campo]: statusDoErro, type: tipo });

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(erroDoParser, hostFalso(capturada));
    });

    expect(capturada.status).toBe(400);
    expect(capturada.corpo).toStrictEqual({ erro: 'CORPO_INVALIDO', correlacaoId });
    expect(logAviso).toHaveBeenCalledWith(expect.stringContaining(correlacaoId));
    expect(logErro).not.toHaveBeenCalled();
    logAviso.mockRestore();
  });

  it.each([
    [{ status: 500, type: 'qualquer.coisa' }],
    [{ status: 400 }],
    [{ status: '400', type: 'entity.parse.failed' }],
    [{ type: 'entity.parse.failed' }],
  ])('erro com forma parcial de body-parser (%j) continua 500 ERRO_INTERNO', (campos) => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(Object.assign(new Error('x'), campos), hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
    expect(capturada.corpo).toStrictEqual({ erro: 'ERRO_INTERNO', correlacaoId });
    expect(logErro).toHaveBeenCalled();
  });

  it('OptimisticLockError do MikroORM vira 409 VERSAO_DESATUALIZADA', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(erroDeVersaoDesatualizada('Usuario'), hostFalso(capturada));
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

  it.each([
    [400, 'CORPO_INVALIDO'],
    [401, 'NAO_AUTENTICADO'],
    [403, 'SEM_PERMISSAO'],
    [404, 'RECURSO_NAO_ENCONTRADO'],
  ] as const)('HttpException %i sem código no corpo cai no mapa por status e vira %s', (statusHttp, codigo) => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException('mensagem livre', statusHttp), hostFalso(capturada));
    });

    expect(capturada.status).toBe(statusHttp);
    expect(capturada.corpo).toStrictEqual({ erro: codigo, correlacaoId });
  });

  it.each([
    [401, 'USUARIO_SUSPENSO', 401],
    [401, 'USUARIO_REVOGADO', 401],
    [401, 'USUARIO_CONVITE_PENDENTE', 401],
    [401, 'USUARIO_DESCONHECIDO', 401],
    [503, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL', 503],
    [422, 'CHAVE_DE_IDEMPOTENCIA_REUTILIZADA', 422],
  ] as const)('HttpException %i com corpo { erro: %s } responde %i com esse código e a correlacaoId do filtro', (statusDaExcecao, codigo, statusEsperado) => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException({ erro: codigo, correlacaoId: '' }, statusDaExcecao), hostFalso(capturada));
    });

    expect(capturada.status).toBe(statusEsperado);
    expect(capturada.corpo).toStrictEqual({ erro: codigo, correlacaoId });
    expect(logErro).not.toHaveBeenCalled();
  });

  it('o status vem do catálogo, não da exceção', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException({ erro: 'USUARIO_SUSPENSO' }, 418), hostFalso(capturada));
    });

    expect(capturada.status).toBe(401);
    expect(capturada.corpo).toStrictEqual({ erro: 'USUARIO_SUSPENSO', correlacaoId });
  });

  it('detalhes em forma de registro são repassados', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException({ erro: 'USUARIO_SUSPENSO', detalhes: { motivo: 'x' } }, 401), hostFalso(capturada));
    });

    expect(capturada.corpo).toStrictEqual({ erro: 'USUARIO_SUSPENSO', detalhes: { motivo: 'x' }, correlacaoId });
  });

  it.each([['texto'], [['a']], [null], [7]])('detalhes fora de forma de registro (%j) são omitidos', (detalhes) => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException({ erro: 'USUARIO_SUSPENSO', detalhes }, 401), hostFalso(capturada));
    });

    expect(capturada.corpo).toStrictEqual({ erro: 'USUARIO_SUSPENSO', correlacaoId });
  });

  it.each([
    [{ erro: 'CODIGO_QUE_NAO_EXISTE' }, 403, 403, 'SEM_PERMISSAO'],
    [{ erro: 42 }, 403, 403, 'SEM_PERMISSAO'],
    [{ mensagem: 'sem erro' }, 404, 404, 'RECURSO_NAO_ENCONTRADO'],
    ['USUARIO_SUSPENSO', 401, 401, 'NAO_AUTENTICADO'],
    [{ erro: 'CODIGO_QUE_NAO_EXISTE' }, 418, 500, 'ERRO_INTERNO'],
  ] as const)('corpo %j em HttpException %i não é código do catálogo — cai no mapa por status', (corpoDaExcecao, statusDaExcecao, statusEsperado, codigo) => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException(corpoDaExcecao, statusDaExcecao), hostFalso(capturada));
    });

    expect(capturada.status).toBe(statusEsperado);
    expect(capturada.corpo).toStrictEqual({ erro: codigo, correlacaoId });
  });

  it('HttpException nativa sem código de domínio conhecido nunca mistura status alheio com ERRO_INTERNO — vira 500', () => {
    const correlacaoId = randomUUID();

    comCorrelacaoId(correlacaoId, () => {
      filtro.catch(new HttpException('limite excedido', HttpStatus.TOO_MANY_REQUESTS), hostFalso(capturada));
    });

    expect(capturada.status).toBe(500);
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

  it('a correlacaoId vem da requisição, não do ContextoDaRequisicao — o corpo do erro tem que bater com o que a borda gravou', () => {
    const correlacaoIdDaRequisicao = randomUUID();
    const correlacaoIdDoContextoAtivo = randomUUID();
    const requisicao = {};
    gravarCorrelacaoNaRequisicao(requisicao, correlacaoIdDaRequisicao);
    const resposta = {
      status(codigo: number) {
        capturada.status = codigo;
        return resposta;
      },
      json(corpo: CorpoDeErro) {
        capturada.corpo = corpo;
      },
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => resposta, getRequest: () => requisicao }),
    } as unknown as ArgumentsHost;

    comCorrelacaoId(correlacaoIdDoContextoAtivo, () => {
      filtro.catch(new Error('algo quebrou'), host);
    });

    expect(capturada.corpo?.correlacaoId).toBe(correlacaoIdDaRequisicao);
    expect(capturada.corpo?.correlacaoId).not.toBe(correlacaoIdDoContextoAtivo);
  });

  it('sem ContextoDaRequisicao ativo, gera uma correlacaoId própria em vez de quebrar', () => {
    filtro.catch(new Error('sem contexto'), hostFalso(capturada));

    expect(capturada.status).toBe(500);
    expect(typeof capturada.corpo?.correlacaoId).toBe('string');
    expect(capturada.corpo?.correlacaoId.length).toBeGreaterThan(0);
  });
});
