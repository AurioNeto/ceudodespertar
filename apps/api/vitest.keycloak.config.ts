import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import SequenciadorAlfabetico from './test/keycloak-real/sequenciador-alfabetico.js';

const CONDICAO_FONTE = '@cdd/fonte';

export default defineConfig({
  plugins: [swc.vite()],
  ssr: {
    resolve: {
      conditions: [CONDICAO_FONTE, 'module', 'node', 'development|production'],
    },
  },
  test: {
    setupFiles: ['reflect-metadata'],
    include: ['test/keycloak-real/**/*.aceite.ts'],
    globalSetup: ['test/keycloak-real/preparacao-global.ts'],
    silent: false,
    fileParallelism: false,
    sequence: { sequencer: SequenciadorAlfabetico },
    testTimeout: 90_000,
    hookTimeout: 120_000,
  },
});
