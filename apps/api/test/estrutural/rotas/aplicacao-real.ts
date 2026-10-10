import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { vi } from 'vitest';
import { criarAplicacao, PREFIXO_GLOBAL, ROTAS_FORA_DO_PREFIXO } from '../../../src/composicao/aplicacao.js';
import { AppModule } from '../../../src/composicao/app.module.js';
import { descobrirRotas } from './descobrir-rotas.js';
import type { Descoberta } from './descobrir-rotas.js';

export interface AplicacaoDescoberta {
  readonly app: INestApplication;
  readonly descoberta: Descoberta;
  encerrar(): Promise<void>;
}

export async function subirAplicacaoEDescobrirRotas(): Promise<AplicacaoDescoberta> {
  vi.stubEnv('OIDC_EMISSOR', 'http://localhost:8080/realms/cdd');
  vi.stubEnv('OIDC_AUDIENCIA', 'cdd-api');
  vi.stubEnv('BANCO_URL', 'postgres://cdd_app:sem-banco@127.0.0.1:1/cdd');
  vi.stubEnv('BANCO_POOL_MAXIMO', '1');
  vi.stubEnv('LOG_NIVEL', 'fatal');
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const app = await criarAplicacao(AppModule);
  await app.init();
  const descoberta = descobrirRotas(app.get(DiscoveryService), app.get(MetadataScanner), app.get(Reflector), {
    prefixoGlobal: PREFIXO_GLOBAL,
    foraDoPrefixo: ROTAS_FORA_DO_PREFIXO,
  });
  return {
    app,
    descoberta,
    encerrar: async () => {
      await app.close();
      vi.useRealTimers();
      vi.unstubAllEnvs();
    },
  };
}
