import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { BadRequestException, Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { ConfiguracaoModule } from '../../src/shared/infrastructure/configuracao/configuracao.module.js';
import { ContextoDaRequisicao } from '../../src/shared/infrastructure/contexto-da-requisicao.js';
import { CABECALHO_DE_CORRELACAO } from '../../src/shared/infrastructure/log/correlacao.js';
import { CHAVE_DA_CORRELACAO_DO_CLIENTE_NO_LOG } from '../../src/shared/infrastructure/log/opcoes-do-logger.js';
import { LogModule } from '../../src/shared/infrastructure/log/log.module.js';

const SEGREDO = 'segredo-que-nao-pode-vazar';
const CPF = '123.456.789-09';
const FORMATO_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ORIGEM_PERMITIDA = 'https://painel.ceudodespertar.test';
const MENSAGENS_DE_CONCLUSAO = new Set(['request completed', 'request errored']);

const escritas: string[] = [];
const destino = { write: (linha: string) => escritas.push(linha) };

function linhas(): Record<string, unknown>[] {
  return escritas.map((linha) => JSON.parse(linha) as Record<string, unknown>);
}

async function aguardarLinha(predicado: (linha: Record<string, unknown>) => boolean): Promise<void> {
  await vi.waitFor(() => expect(linhas().some(predicado)).toBe(true), { timeout: 2_000 });
}

async function linhaDeConclusao(correlacaoId: string | null): Promise<Record<string, unknown>> {
  const ehDaConclusao = (linha: Record<string, unknown>): boolean =>
    linha.correlacaoId === correlacaoId && MENSAGENS_DE_CONCLUSAO.has(String(linha.msg));
  await aguardarLinha(ehDaConclusao);
  const daConclusao = linhas().filter(ehDaConclusao);
  expect(daConclusao).toHaveLength(1);
  return daConclusao[0] as Record<string, unknown>;
}

@Controller('sonda')
class SondaController {
  constructor(private readonly logger: PinoLogger) {}

  @Get()
  ler(): { correlacaoId?: string } {
    this.logger.info({ etapa: 'dentro-do-handler' }, 'sonda lida');
    return { correlacaoId: ContextoDaRequisicao.atual()?.correlacaoId };
  }

  @Post()
  gravar(@Body() _corpo: unknown): { ok: true } {
    this.logger.info({ etapa: 'gravou', usuario: { senha: SEGREDO, cpf: CPF } }, 'sonda gravada');
    return { ok: true };
  }

  @Get('recusada')
  recusada(): never {
    throw new BadRequestException('pedido inválido');
  }

  @Get('quebrada')
  quebrada(): never {
    throw new Error('falha inesperada');
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
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('ORIGENS_CORS', ORIGEM_PERMITIDA);
    app = await criarAplicacao(ModuloDeSonda);
    await app.listen(0);
    const endereco = app.getHttpServer().address() as AddressInfo;
    origem = `http://127.0.0.1:${endereco.port}`;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    escritas.length = 0;
  });

  it('gera o correlacaoId no servidor mesmo com X-Correlacao-Id válido e guarda o do cliente à parte', async () => {
    const doCliente = randomUUID();

    const resposta = await fetch(`${origem}/api/v1/sonda`, {
      headers: { [CABECALHO_DE_CORRELACAO]: doCliente },
    });

    const correlacaoId = resposta.headers.get(CABECALHO_DE_CORRELACAO);
    expect(correlacaoId).toMatch(FORMATO_DE_UUID);
    expect(correlacaoId).not.toBe(doCliente);
    expect(await resposta.json()).toStrictEqual({ correlacaoId });
    const concluida = await linhaDeConclusao(correlacaoId);
    expect(concluida[CHAVE_DA_CORRELACAO_DO_CLIENTE_NO_LOG]).toBe(doCliente);
    const daRequisicao = linhas().filter((linha) => linha.correlacaoId === correlacaoId);
    expect(daRequisicao.map((linha) => linha.msg)).toStrictEqual(['sonda lida', 'request completed']);
    expect(linhas().some((linha) => linha.correlacaoId === doCliente)).toBe(false);
  });

  it('normaliza para minúsculas o X-Correlacao-Id do cliente', async () => {
    const doCliente = randomUUID();

    const resposta = await fetch(`${origem}/api/v1/sonda`, {
      headers: { [CABECALHO_DE_CORRELACAO]: doCliente.toUpperCase() },
    });
    await resposta.text();

    const concluida = await linhaDeConclusao(resposta.headers.get(CABECALHO_DE_CORRELACAO));
    expect(concluida[CHAVE_DA_CORRELACAO_DO_CLIENTE_NO_LOG]).toBe(doCliente);
  });

  it.each(['nao-e-uuid', `${randomUUID()}x`, ''])(
    'gera um UUID e não registra correlacaoIdDoCliente quando o cabeçalho recebido é "%s"',
    async (recebido) => {
      const resposta = await fetch(`${origem}/api/v1/sonda`, {
        headers: { [CABECALHO_DE_CORRELACAO]: recebido },
      });

      const devolvido = resposta.headers.get(CABECALHO_DE_CORRELACAO);
      expect(devolvido).toMatch(FORMATO_DE_UUID);
      expect(devolvido).not.toBe(recebido);
      expect(await resposta.json()).toStrictEqual({ correlacaoId: devolvido });
      const concluida = await linhaDeConclusao(devolvido);
      expect(concluida.correlacaoId).toBe(devolvido);
      expect(concluida).not.toHaveProperty(CHAVE_DA_CORRELACAO_DO_CLIENTE_NO_LOG);
    },
  );

  it('expõe o X-Correlacao-Id e o Retry-After ao navegador pelo CORS', async () => {
    const resposta = await fetch(`${origem}/api/v1/sonda`, { headers: { Origin: ORIGEM_PERMITIDA } });
    await resposta.text();

    expect(resposta.headers.get('access-control-allow-origin')).toBe(ORIGEM_PERMITIDA);
    expect(resposta.headers.get('access-control-expose-headers')).toBe(`${CABECALHO_DE_CORRELACAO},Retry-After`);
  });

  it.each([
    ['/api/v1/sonda', 200, 'info'],
    ['/api/v1/sonda/recusada', 400, 'warn'],
    ['/api/v1/rota-que-nao-existe', 404, 'warn'],
    ['/api/v1/sonda/quebrada', 500, 'error'],
  ])('registra %s com status %d no nível %s', async (caminho, status, nivel) => {
    const resposta = await fetch(`${origem}${caminho}`);
    await resposta.text();

    expect(resposta.status).toBe(status);
    const concluida = await linhaDeConclusao(resposta.headers.get(CABECALHO_DE_CORRELACAO));
    expect(concluida).toMatchObject({ level: nivel, res: { statusCode: status } });
  });

  it.each([
    ['JSON inválido', { 'content-type': 'application/json' }, `{"senha":"${SEGREDO}",`, 400],
    ['corpo grande demais', { 'content-type': 'application/json' }, JSON.stringify({ senha: SEGREDO, lixo: 'x'.repeat(200_000) }), 413],
    ['charset não suportado', { 'content-type': 'application/json; charset=latin1' }, JSON.stringify({ senha: SEGREDO }), 415],
  ])('registra a requisição recusada pelo body parser (%s) sem vazar o corpo', async (_caso, cabecalhos, corpo, status) => {
    const resposta = await fetch(`${origem}/api/v1/sonda`, { method: 'POST', headers: cabecalhos, body: corpo });
    await resposta.text();

    expect(resposta.status).toBe(status);
    const concluida = await linhaDeConclusao(resposta.headers.get(CABECALHO_DE_CORRELACAO));
    expect(concluida).toMatchObject({ level: 'warn', req: { method: 'POST', url: '/api/v1/sonda' }, res: { statusCode: status } });
    expect(escritas.join('')).not.toContain(SEGREDO);
  });

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
