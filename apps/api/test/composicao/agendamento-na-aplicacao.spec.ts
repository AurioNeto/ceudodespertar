import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { AppModule } from '../../src/composicao/app.module.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import {
  INTERVALO_DA_VIGIA_EM_MS,
  VigiaDeEventosEsgotados,
} from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import {
  ExpurgoDeChavesDeIdempotencia,
  INTERVALO_DO_EXPURGO_EM_MS,
} from '../../src/shared/infrastructure/idempotencia/expurgo-de-chaves-de-idempotencia.js';

const INTERVALO_DO_DESPACHANTE_EM_MS = 1000;

describe('trabalhos em segundo plano agendados pela aplicação', () => {
  let app: INestApplication;
  const executarCiclo = vi.spyOn(Despachante.prototype, 'executarCiclo');
  const verificar = vi.spyOn(VigiaDeEventosEsgotados.prototype, 'verificar');
  const expurgar = vi.spyOn(ExpurgoDeChavesDeIdempotencia.prototype, 'expurgar');

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    executarCiclo.mockResolvedValue(undefined);
    verificar.mockResolvedValue(undefined);
    expurgar.mockResolvedValue(undefined);
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    app = await criarAplicacao(AppModule);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('o despachante roda a cada segundo', async () => {
    const antes = executarCiclo.mock.calls.length;

    await vi.advanceTimersByTimeAsync(INTERVALO_DO_DESPACHANTE_EM_MS);

    expect(executarCiclo.mock.calls.length - antes).toBe(1);
  });

  it('a vigia de eventos esgotados roda a cada minuto', async () => {
    const antes = verificar.mock.calls.length;

    await vi.advanceTimersByTimeAsync(INTERVALO_DA_VIGIA_EM_MS);

    expect(verificar.mock.calls.length - antes).toBe(1);
  });

  it('o expurgo de chaves de idempotência roda na partida e a cada hora', async () => {
    expect(expurgar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(INTERVALO_DO_EXPURGO_EM_MS);

    expect(expurgar).toHaveBeenCalledTimes(2);
  });
});
