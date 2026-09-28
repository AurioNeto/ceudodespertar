import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { ConfiguracaoModule } from '../../src/shared/infrastructure/configuracao/configuracao.module.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { CABECALHO_DE_CORRELACAO } from '../../src/shared/infrastructure/log/correlacao.js';
import { LogModule } from '../../src/shared/infrastructure/log/log.module.js';

const SEGREDO = 'segredo-que-nao-pode-vazar';
const CPF = '123.456.789-09';
const FORMATO_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const escritas: string[] = [];
const destino = { write: (linha: string) => escritas.push(linha) };

function linhas(): Record<string, unknown>[] {
  return escritas.map((linha) => JSON.parse(linha) as Record<string, unknown>);
}

async function aguardarLinha(predicado: (linha: Record<string, unknown>) => boolean): Promise<void> {
  await vi.waitFor(() => expect(linhas().some(predicado)).toBe(true), { timeout: 2_000 });
}

@Controller('sonda')
class SondaController {
  constructor(private readonly logger: PinoLogger) {}

  @Get()
  ler(): { correlacaoId?: string } {
    this.logger.info({ passo: 'dentro-do-handler' }, 'sonda lida');
    return { correlacaoId: ContextoDaRequisicao.atual()?.correlacaoId };
  }

  @Post()
  gravar(@Body() _corpo: unknown): { ok: true } {
    this.logger.info({ passo: 'gravou', usuario: { senha: SEGREDO, cpf: CPF } }, 'sonda gravada');
    return { ok: true };
  }
}

@Module({
  imports: [ConfiguracaoModule, LogModule.paraRaiz(destino)],
  controllers: [SondaController],
})
class ModuloDeSonda {}

describe('log por requisição: correlação e redação (Documento 7 §13)', () => {
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    app = await criarAplicacao(ModuloDeSonda);
    await app.listen(0);
    const endereco = app.getHttpServer().address() as AddressInfo;
    origem = `http://127.0.0.1:${endereco.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    escritas.length = 0;
  });

  it('reusa o X-Correlacao-Id válido: volta na resposta, no ContextoDaRequisicao e em toda linha', async () => {
    const correlacaoId = randomUUID();

    const resposta = await fetch(`${origem}/api/v1/sonda`, {
      headers: { [CABECALHO_DE_CORRELACAO]: correlacaoId },
    });

    expect(resposta.headers.get(CABECALHO_DE_CORRELACAO)).toBe(correlacaoId);
    expect(await resposta.json()).toStrictEqual({ correlacaoId });
    await aguardarLinha((linha) => linha.msg === 'request completed');
    const daRequisicao = linhas().filter((linha) => linha.passo !== undefined || linha.msg === 'request completed');
    expect(daRequisicao.map((linha) => linha.msg)).toStrictEqual(['sonda lida', 'request completed']);
    expect(daRequisicao.every((linha) => linha.correlacaoId === correlacaoId)).toBe(true);
  });

  it.each(['nao-e-uuid', `${randomUUID()}x`, ''])(
    'gera um UUID novo quando o cabeçalho recebido é "%s"',
    async (recebido) => {
      const resposta = await fetch(`${origem}/api/v1/sonda`, {
        headers: { [CABECALHO_DE_CORRELACAO]: recebido },
      });

      const devolvido = resposta.headers.get(CABECALHO_DE_CORRELACAO);
      expect(devolvido).toMatch(FORMATO_DE_UUID);
      expect(devolvido).not.toBe(recebido);
      expect(await resposta.json()).toStrictEqual({ correlacaoId: devolvido });
    },
  );

  it('não loga cabeçalho de credencial, corpo da requisição nem CPF', async () => {
    const resposta = await fetch(`${origem}/api/v1/sonda?token=${SEGREDO}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${SEGREDO}`,
        Cookie: `sessao=${SEGREDO}`,
      },
      body: JSON.stringify({ senha: SEGREDO, cpf: CPF, anamnese: { queixa: SEGREDO } }),
    });
    expect(resposta.status).toBe(201);

    await aguardarLinha((linha) => linha.msg === 'request completed');
    const concluida = linhas().find((linha) => linha.msg === 'request completed');
    expect(concluida).toMatchObject({
      req: { method: 'POST', url: '/api/v1/sonda', headers: { authorization: '[REDIGIDO]', cookie: '[REDIGIDO]' } },
      res: { statusCode: 201 },
    });
    expect(linhas().find((linha) => linha.msg === 'sonda gravada')).toMatchObject({
      usuario: { senha: '[REDIGIDO]', cpf: '[REDIGIDO]' },
    });
    const bruto = escritas.join('');
    expect(bruto).not.toContain(SEGREDO);
    expect(bruto).not.toContain(CPF);
  });

  it('não gera linha de acesso para as sondas de saúde', async () => {
    const resposta = await fetch(`${origem}/saude/qualquer`);
    await resposta.text();

    const correlacaoId = resposta.headers.get(CABECALHO_DE_CORRELACAO);
    expect(correlacaoId).toMatch(FORMATO_DE_UUID);
    await fetch(`${origem}/api/v1/sonda`);
    await aguardarLinha((linha) => linha.msg === 'request completed');
    expect(linhas().some((linha) => linha.correlacaoId === correlacaoId)).toBe(false);
  });
});
