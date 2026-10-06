import type { AddressInfo } from 'node:net';
import { Controller, Get, Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { ConfiguracaoModule } from '../../src/shared/infrastructure/configuracao/configuracao.module.js';
import { FiltroDeErrosModule } from '../../src/shared/infrastructure/http/filtro-de-erros.module.js';
import { CABECALHO_DE_CORRELACAO } from '../../src/shared/infrastructure/log/correlacao.js';
import { LogModule } from '../../src/shared/infrastructure/log/log.module.js';

@Controller('sonda')
class SondaController {
  @Get('quebrada')
  quebrada(): never {
    throw new Error('falha inesperada');
  }
}

@Module({
  imports: [ConfiguracaoModule, LogModule.paraRaiz({ write: () => undefined }), FiltroDeErrosModule],
  controllers: [SondaController],
})
class ModuloDeSonda {}

describe('filtro de erros lê a mesma correlacaoId que o middleware de log grava', () => {
  let app: INestApplication;
  let origem: string;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('ORIGENS_CORS', 'https://painel.ceudodespertar.test');
    app = await criarAplicacao(ModuloDeSonda);
    await app.listen(0);
    origem = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it.each(['/api/v1/sonda/quebrada', '/api/v1/rota-inexistente'])(
    'o corpo de erro de %s traz a correlacaoId do cabeçalho de resposta',
    async (caminho) => {
      const resposta = await fetch(`${origem}${caminho}`);

      const corpo = (await resposta.json()) as { correlacaoId: string };
      expect(resposta.status).toBeGreaterThanOrEqual(400);
      expect(corpo.correlacaoId).toBe(resposta.headers.get(CABECALHO_DE_CORRELACAO));
    },
  );
});
