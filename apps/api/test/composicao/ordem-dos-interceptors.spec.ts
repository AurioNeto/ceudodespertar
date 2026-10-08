import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { LoggerErrorInterceptor } from 'nestjs-pino';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { AppModule } from '../../src/composicao/app.module.js';
import { BordaTransacionalInterceptor } from '../../src/shared/infrastructure/http/borda-transacional.interceptor.js';
import { IdempotenciaInterceptor } from '../../src/shared/infrastructure/idempotencia/idempotencia.interceptor.js';

interface AplicacaoComConfiguracao {
  readonly config: { getGlobalInterceptors(): object[] };
}

describe('ordem efetiva dos interceptors globais da aplicação real', () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    app = await criarAplicacao(AppModule);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('a borda transacional vem primeiro, a idempotência depois e o logger de erros por último', () => {
    const interceptors = (app as unknown as AplicacaoComConfiguracao).config.getGlobalInterceptors();

    expect(interceptors.map((interceptor) => interceptor.constructor)).toEqual([
      BordaTransacionalInterceptor,
      IdempotenciaInterceptor,
      LoggerErrorInterceptor,
    ]);
  });
});
