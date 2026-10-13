import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { criarAplicacao } from '../../src/composicao/aplicacao.js';
import { AppModule } from '../../src/composicao/app.module.js';
import { TIPOS_DE_EVENTO_DA_IDENTIDADE } from '../../src/modules/identidade/domain/eventos-da-identidade.js';
import { Despachante } from '../../src/shared/infrastructure/eventos/despachante.js';
import { ExpurgoDoOutbox } from '../../src/shared/infrastructure/eventos/expurgo-do-outbox.js';
import { RegistroDeConsumidores } from '../../src/shared/infrastructure/eventos/registro-de-consumidores.js';
import { VigiaDeEventosEsgotados } from '../../src/shared/infrastructure/eventos/vigia-de-eventos-esgotados.js';
import { ExpurgoDeChavesDeIdempotencia } from '../../src/shared/infrastructure/idempotencia/expurgo-de-chaves-de-idempotencia.js';

describe('destino de cada evento na aplicação', () => {
  let app: INestApplication;

  beforeAll(async () => {
    vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
    vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
    vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
    vi.stubEnv('BANCO_POOL_MAXIMO', '1');
    vi.stubEnv('LOG_NIVEL', 'fatal');
    vi.spyOn(Despachante.prototype, 'executarCiclo').mockResolvedValue(undefined);
    vi.spyOn(VigiaDeEventosEsgotados.prototype, 'verificar').mockResolvedValue(undefined);
    vi.spyOn(ExpurgoDeChavesDeIdempotencia.prototype, 'expurgar').mockResolvedValue(undefined);
    vi.spyOn(ExpurgoDoOutbox.prototype, 'expurgar').mockResolvedValue(undefined);
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

  it.each(TIPOS_DE_EVENTO_DA_IDENTIDADE)(
    '%s tem consumidor ou está declarado em @EventosSemConsumidor, para não esgotar nem travar o agregado',
    (tipo) => {
      const registro = app.get(RegistroDeConsumidores);

      expect(registro.consumidoresPara(tipo).length > 0 || registro.dispensaConsumidor(tipo)).toBe(true);
    },
  );
});
