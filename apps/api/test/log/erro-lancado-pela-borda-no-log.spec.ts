import type { AddressInfo } from 'node:net';
import { Controller, Module, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { UnidadeDeTrabalho } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import type { ContextoDaTransacao, ModoDeTransacao } from '../../src/shared/infrastructure/banco/unidade-de-trabalho.js';
import { ConfiguracaoModule } from '../../src/shared/infrastructure/configuracao/configuracao.module.js';
import { BordaTransacionalInterceptor } from '../../src/shared/infrastructure/http/borda-transacional.interceptor.js';
import { FiltroDeErrosModule } from '../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { ModoDeTransacao as ComModoDeTransacao } from '../../src/shared/infrastructure/http/modo-de-transacao.decorator.js';
import { ProvedorDeContextoDeInstituicao } from '../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.js';
import { ProvedorDeContextoDeInstituicaoVazio } from '../../src/shared/infrastructure/http/provedor-de-contexto-de-instituicao.vazio.js';
import { CABECALHO_DE_CORRELACAO } from '../../src/shared/infrastructure/log/correlacao.js';
import { LogModule } from '../../src/shared/infrastructure/log/log.module.js';

const NIVEL_ERROR_DO_PINO = 'error';

class UnidadeDeTrabalhoComFalhaNoCommit extends UnidadeDeTrabalho {
  async transacao<T>(_modo: ModoDeTransacao, fn: (contexto: ContextoDaTransacao) => Promise<T>): Promise<T> {
    await fn({} as ContextoDaTransacao);
    throw new Error('falha no commit');
  }
}

@Controller('sonda')
class SondaController {
  @ComModoDeTransacao('escrita')
  @Post('commit-quebra')
  commitQuebra(): void {}
}

const linhasDeLog: Record<string, unknown>[] = [];

@Module({
  imports: [
    ConfiguracaoModule,
    LogModule.paraRaiz({
      write: (linha: string) => void linhasDeLog.push(JSON.parse(linha) as Record<string, unknown>),
    }),
    FiltroDeErrosModule,
  ],
  controllers: [SondaController],
  providers: [
    { provide: UnidadeDeTrabalho, useClass: UnidadeDeTrabalhoComFalhaNoCommit },
    { provide: ProvedorDeContextoDeInstituicao, useClass: ProvedorDeContextoDeInstituicaoVazio },
    BordaTransacionalInterceptor,
    { provide: APP_INTERCEPTOR, useExisting: BordaTransacionalInterceptor },
  ],
})
class ModuloComCommitQuebrado {}

describe('erro lançado pela borda não passa pelo LoggerErrorInterceptor e mesmo assim é logado', () => {
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    app = await criarAplicacao(ModuloComCommitQuebrado);
    await app.listen(0);
    origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('falha no commit responde 500 e o filtro global loga em nível error com a correlacaoId da resposta', async () => {
    const resposta = await fetch(`${origem}/api/v1/sonda/commit-quebra`, { method: 'POST' });

    const correlacaoId = resposta.headers.get(CABECALHO_DE_CORRELACAO);
    expect(resposta.status).toBe(500);
    const erroLogado = linhasDeLog.find(
      (linha) => linha.level === NIVEL_ERROR_DO_PINO && String(linha.msg).includes(`correlacaoId=${correlacaoId}`),
    );
    expect(erroLogado).toBeDefined();
  });
});
