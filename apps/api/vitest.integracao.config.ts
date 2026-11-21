import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { AMBIENTE_DO_KEYCLOAK_DE_TESTE } from './test/ambiente-de-teste.js';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  plugins: [swc.vite()],
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  test: {
    env: { ...AMBIENTE_DO_KEYCLOAK_DE_TESTE },
    setupFiles: ['reflect-metadata'],
    include: ['**/*.integracao.test.ts'],
    globalSetup: ['test/integracao/preparacao-global.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
