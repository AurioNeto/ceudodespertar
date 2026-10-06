import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import type { Logger } from 'pino';
import { NOME_DO_SERVICO, construirOpcoesDoPino } from './opcoes-do-logger.js';
import { VALOR_REDIGIDO } from './redacao.js';

const SEGREDO = 'segredo-que-nao-pode-vazar';

function loggerQueCaptura(): { logger: Logger; linhas: () => Record<string, unknown>[]; bruto: () => string } {
  const escritas: string[] = [];
  const logger = pino(construirOpcoesDoPino('info'), { write: (linha: string) => escritas.push(linha) });
  return {
    logger,
    bruto: () => escritas.join(''),
    linhas: () => escritas.map((linha) => JSON.parse(linha) as Record<string, unknown>),
  };
}

describe('opções do pino', () => {
  it('escreve JSON com nível em texto, horário ISO e o nome do serviço', () => {
    const { logger, linhas } = loggerQueCaptura();

    logger.info({ evento: 'partida' }, 'api de pé');

    expect(linhas()).toStrictEqual([
      expect.objectContaining({
        level: 'info',
        servico: NOME_DO_SERVICO,
        evento: 'partida',
        msg: 'api de pé',
        time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    ]);
  });

  it('redige cabeçalhos proibidos da requisição, em qualquer caixa, e tira a query string', () => {
    const { logger, linhas, bruto } = loggerQueCaptura();

    logger.info({
      req: {
        method: 'POST',
        url: `/api/v1/pessoas?token=${SEGREDO}`,
        headers: { Authorization: `Bearer ${SEGREDO}`, cookie: SEGREDO, 'user-agent': 'vitest' },
        body: { senha: SEGREDO },
        remoteAddress: '10.0.0.1',
      },
    });

    expect(linhas()[0]?.req).toStrictEqual({
      method: 'POST',
      url: '/api/v1/pessoas',
      headers: { Authorization: VALOR_REDIGIDO, cookie: VALOR_REDIGIDO, 'user-agent': 'vitest' },
    });
    expect(bruto()).not.toContain(SEGREDO);
  });

  it('redige set-cookie da resposta', () => {
    const { logger, linhas, bruto } = loggerQueCaptura();

    logger.info({ res: { statusCode: 200, headers: { 'Set-Cookie': SEGREDO, 'content-type': 'json' } } });

    expect(linhas()[0]?.res).toStrictEqual({
      statusCode: 200,
      headers: { 'Set-Cookie': VALOR_REDIGIDO, 'content-type': 'json' },
    });
    expect(bruto()).not.toContain(SEGREDO);
  });

  it('redige campos proibidos aninhados no objeto do log e no erro', () => {
    const { logger, linhas, bruto } = loggerQueCaptura();
    const erro = Object.assign(new Error('falhou'), { contexto: { SENHA: SEGREDO } });

    logger.error({ err: erro, comando: { usuario: { Senha: SEGREDO, nome: 'Ana' } } }, 'comando falhou');

    expect(linhas()[0]).toMatchObject({
      err: { type: 'Error', message: 'falhou', contexto: { SENHA: VALOR_REDIGIDO } },
      comando: { usuario: { Senha: VALOR_REDIGIDO, nome: 'Ana' } },
    });
    expect(bruto()).not.toContain(SEGREDO);
  });

  it('redige campos proibidos nos bindings de um logger filho', () => {
    const { logger, linhas, bruto } = loggerQueCaptura();

    logger.child({ conta: { refreshToken: SEGREDO, id: 's-1' } }).info('filho');

    expect(linhas()[0]).toMatchObject({ conta: { refreshToken: VALOR_REDIGIDO, id: 's-1' }, msg: 'filho' });
    expect(bruto()).not.toContain(SEGREDO);
  });
});
